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

    public function createAppointment($customerId, $serviceId, $staffId, $date, $startTime, $address, $addressNotes = null, $customerNotes = null)
    {
        $appointment = DB::transaction(function () use ($customerId, $serviceId, $staffId, $date, $startTime, $address, $addressNotes, $customerNotes) {
            
            $service = Service::where('id', $serviceId)
                ->where('is_active', true)
                ->where('is_home_service', true)
                ->whereHas('category', fn ($query) => $query->where('is_active', true))
                ->first();
            if (!$service) {
                throw new Exception("Service not found, inactive, or not available for home service.");
            }

            // Lock staff row to serialize concurrent bookings for same staff
            $staff = User::where('id', $staffId)->where('role', 'staff')->where('is_active', true)->lockForUpdate()->first();
            if (!$staff || !$staff->profile || !$staff->profile->is_available) {
                throw new Exception("Hairstylist not available.");
            }

            // Check Qualification
            if (!$staff->services()->where('service_id', $service->id)->exists()) {
                throw new Exception("Hairstylist not qualified for this service.");
            }

            // Double check slots
            $slots = $this->availabilityService->getAvailableSlots($service, $staff, $date);
            $validSlot = collect($slots)->firstWhere('start', Carbon::parse($startTime)->format('H:i'));

            if (!$validSlot) {
                throw new Exception("This appointment time is no longer available.", 409); // 409 Conflict
            }

            $customer = User::findOrFail($customerId);

            // Allocate the yearly sequence while holding a database row lock.
            $year = Carbon::parse($date, config('app.timezone'))->year;
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
            $priceInCents = (int) round(((float) $service->price) * 100);
            $requiredDownpayment = round($priceInCents * (float) $percentage / 100) / 100;

            $appointment = Appointment::create([
                'appointment_number' => $appointmentNumber,
                'customer_id' => $customer->id,
                'staff_user_id' => $staff->id,
                'service_id' => $service->id,
                'appointment_date' => $date,
                'start_time' => $validSlot['start'],
                'end_time' => $validSlot['end'],
                'service_name_snapshot' => $service->name,
                'service_price_snapshot' => $service->price,
                'service_duration_minutes_snapshot' => $service->duration_minutes,
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
