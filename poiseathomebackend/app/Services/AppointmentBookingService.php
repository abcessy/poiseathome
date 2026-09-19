<?php

namespace App\Services;

use App\Models\User;
use App\Models\Service;
use App\Models\Appointment;
use Illuminate\Support\Facades\DB;
use Exception;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class AppointmentBookingService
{
    protected $availabilityService;
    protected $notificationService;

    public function __construct(AppointmentAvailabilityService $availabilityService, NotificationService $notificationService)
    {
        $this->availabilityService = $availabilityService;
        $this->notificationService = $notificationService;
    }

    public function createAppointment($customerId, $serviceId, $staffId, $date, $startTime, $address, $addressNotes = null, $customerNotes = null, $extendedMinutes = 0)
    {
        $appointment = DB::transaction(function () use ($customerId, $serviceId, $staffId, $date, $startTime, $address, $addressNotes, $customerNotes, $extendedMinutes) {
            $tz = config('app.timezone', 'Asia/Manila');
            $serviceIds = is_array($serviceId) ? array_unique($serviceId) : [$serviceId];

            $services = Service::whereIn('id', $serviceIds)
                ->where('is_active', true)
                ->where('is_home_service', true)
                ->whereHas('category', fn ($query) => $query->where('is_active', true))
                ->get();

            if ($services->count() !== count($serviceIds) || $services->isEmpty()) {
                throw new Exception("One or more selected services are unavailable, inactive, or not offered for home service.");
            }

            $primaryService = $services->first();
            $totalDuration = (int) $services->sum('duration_minutes') + max(0, (int) $extendedMinutes);
            $totalPrice = (float) $services->sum('price');
            $serviceNameSnapshot = $services->pluck('name')->implode(' + ');

            // Lock staff row to serialize concurrent bookings for same staff
            $staff = User::where('id', $staffId)->where('role', 'staff')->where('is_active', true)->lockForUpdate()->first();
            if (!$staff || !$staff->profile || !$staff->profile->is_available) {
                throw new Exception("Hairstylist not available.");
            }

            // Check Qualification for all services
            $qualifiedCount = $staff->services()->whereIn('service_id', $serviceIds)->count();
            if ($qualifiedCount !== count($serviceIds)) {
                throw new Exception("Selected hairstylist is not qualified for all selected services.");
            }

            // Calculate start and end times
            $slotStart = Carbon::parse($date . ' ' . $startTime, $tz);
            $slotEnd = $slotStart->copy()->addMinutes($totalDuration);

            // Double check candidate slots with availability service
            $slots = $this->availabilityService->getAvailableSlots($primaryService, $staff, $date, $totalDuration, $customerId);
            $validSlot = collect($slots)->firstWhere('start', $slotStart->format('H:i'));

            if (!$validSlot) {
                throw new Exception("This appointment time is no longer available.", 409); // 409 Conflict
            }

            // Lock and verify staff does not have overlapping appointments
            $hasStaffConflict = Appointment::where('staff_user_id', $staff->id)
                ->whereDate('appointment_date', $date)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->where('start_time', '<', $slotEnd->format('H:i:s'))
                ->where('end_time', '>', $slotStart->format('H:i:s'))
                ->lockForUpdate()
                ->exists();

            if ($hasStaffConflict) {
                throw new Exception("This hairstylist is no longer available for the selected time slot.", 409);
            }

            // Lock and verify customer does not have overlapping appointments (prevent customer double booking)
            $hasCustomerConflict = Appointment::where('customer_id', $customerId)
                ->whereDate('appointment_date', $date)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->where('start_time', '<', $slotEnd->format('H:i:s'))
                ->where('end_time', '>', $slotStart->format('H:i:s'))
                ->lockForUpdate()
                ->exists();

            if ($hasCustomerConflict) {
                throw new Exception("You already have an appointment scheduled during this time slot. Double booking is not permitted.", 409);
            }

            // Check system-wide handling capacity with lock
            $systemCapacity = $this->availabilityService->getSystemHandlingCapacity();
            $concurrentAppointments = Appointment::whereDate('appointment_date', $date)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->where('start_time', '<', $slotEnd->format('H:i:s'))
                ->where('end_time', '>', $slotStart->format('H:i:s'))
                ->lockForUpdate()
                ->count();

            if ($concurrentAppointments >= $systemCapacity) {
                throw new Exception("The salon's maximum appointment capacity for this time slot has been reached. Please select another slot.", 409);
            }

            $customer = User::findOrFail($customerId);

            // Allocate the yearly sequence while holding a database row lock.
            $year = Carbon::parse($date, $tz)->year;
            DB::table('appointment_number_sequences')->insertOrIgnore([
                'year' => $year,
                'last_number' => 0,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $sequence = DB::table('appointment_number_sequences')->where('year', $year)->lockForUpdate()->first();
            $nextNumber = $sequence->last_number + 1;
            DB::table('appointment_number_sequences')->where('year', $year)->update([
                'last_number' => $nextNumber,
                'updated_at' => now(),
            ]);
            $appointmentNumber = 'PAH-' . $year . '-' . str_pad($nextNumber, 6, '0', STR_PAD_LEFT);
            
            $percentage = (string) config('poiseathome.payment.downpayment_percentage', 30);
            $priceInCents = (int) round($totalPrice * 100);
            $requiredDownpayment = round($priceInCents * (float) $percentage / 100) / 100;

            $additionalServicesData = $services->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'price' => (float) $s->price,
                'duration_minutes' => (int) $s->duration_minutes,
            ])->values()->toArray();

            $appointment = Appointment::create([
                'appointment_number' => $appointmentNumber,
                'customer_id' => $customer->id,
                'staff_user_id' => $staff->id,
                'service_id' => $primaryService->id,
                'appointment_date' => $date,
                'start_time' => $slotStart->format('H:i:s'),
                'end_time' => $slotEnd->format('H:i:s'),
                'service_name_snapshot' => $serviceNameSnapshot,
                'service_price_snapshot' => $totalPrice,
                'service_duration_minutes_snapshot' => $totalDuration,
                'extended_minutes' => max(0, (int) $extendedMinutes),
                'additional_services' => $additionalServicesData,
                'customer_name_snapshot' => $customer->name,
                'customer_contact_snapshot' => $customer->contact_number,
                'required_downpayment_amount' => $requiredDownpayment,
                'service_address' => $address,
                'address_notes' => $addressNotes,
                'customer_notes' => $customerNotes,
                'status' => 'pending',
            ]);

            return $appointment;
        });

        try {
            DB::afterCommit(function () use ($appointment, $customerId, $staffId) {
                $this->notificationService->notifyUser(User::find($customerId), [
                    'type' => 'appointment_booked',
                    'title' => 'Appointment Booked',
                    'message' => 'Your appointment ' . $appointment->appointment_number . ' has been booked for ' . $appointment->appointment_date . ' at ' . $appointment->start_time . '.',
                    'reference_type' => 'appointment',
                    'reference_code' => $appointment->appointment_number,
                ]);

                $this->notificationService->notifyAdmins([
                    'type' => 'appointment_booked',
                    'title' => 'New Appointment',
                    'message' => 'A new appointment ' . $appointment->appointment_number . ' has been booked.',
                    'reference_type' => 'appointment',
                    'reference_id' => $appointment->id,
                ]);

                $this->notificationService->notifyStaff(User::find($staffId), [
                    'type' => 'appointment_assigned',
                    'title' => 'New Appointment Assigned',
                    'message' => 'You have been assigned to appointment ' . $appointment->appointment_number . ' on ' . $appointment->appointment_date . ' at ' . $appointment->start_time . '.',
                    'reference_type' => 'appointment',
                    'reference_id' => $appointment->id,
                ]);
            });
        } catch (Exception $e) {
            Log::error('Notifications failed on booking: ' . $e->getMessage());
        }

        return $appointment;
    }
}
