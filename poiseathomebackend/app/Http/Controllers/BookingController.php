<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentAvailabilityService;
use App\Services\AppointmentBookingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BookingController extends Controller
{
    protected $availabilityService;
    protected $bookingService;

    public function __construct(AppointmentAvailabilityService $availabilityService, AppointmentBookingService $bookingService)
    {
        $this->availabilityService = $availabilityService;
        $this->bookingService = $bookingService;
    }

    public function getStaffForService(Service $service)
    {
        if (!$service->is_active || !$service->is_home_service || !$service->category?->is_active) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $staff = $service->qualifiedStaff()
            ->where('role', 'staff')
            ->where('is_active', true)
            ->whereHas('profile', function($q) {
                $q->where('is_available', true);
            })
            ->with('profile')
            ->get()
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'display_name' => $user->profile?->display_name ?? $user->name,
                    'specialization' => $user->profile?->specialization,
                    'profile_photo_url' => $user->profile?->profile_photo_path
                        ? Storage::disk('images')->url($user->profile->profile_photo_path)
                        : null,
                ];
            });

        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function getAvailability(Request $request)
    {
        $request->validate([
            'service_id' => 'required|exists:services,id',
            'staff_id' => 'required|exists:users,id',
            'date' => 'required|date_format:Y-m-d'
        ]);

        $service = Service::whereKey($request->service_id)
            ->where('is_active', true)
            ->where('is_home_service', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->firstOrFail();
        $staff = User::where('id', $request->staff_id)
            ->where('role', 'staff')
            ->where('is_active', true)
            ->whereHas('profile', fn ($query) => $query->where('is_available', true))
            ->whereHas('services', fn ($query) => $query->where('services.id', $service->id))
            ->firstOrFail();

        $slots = $this->availabilityService->getAvailableSlots($service, $staff, $request->date);

        return response()->json([
            'status' => 'success',
            'data' => [
                'date' => $request->date,
                'slots' => $slots
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => 'required|exists:services,id',
            'staff_id' => 'required|exists:users,id',
            'date' => 'required|date_format:Y-m-d',
            'start_time' => 'required|date_format:H:i',
            'service_address' => 'required|string',
            'address_notes' => 'nullable|string',
            'customer_notes' => 'nullable|string',
        ]);

        try {
            $appointment = $this->bookingService->createAppointment(
                $request->user()->id,
                $validated['service_id'],
                $validated['staff_id'],
                $validated['date'],
                $validated['start_time'],
                $validated['service_address'],
                $validated['address_notes'] ?? null,
                $validated['customer_notes'] ?? null
            );

            return response()->json(['status' => 'success', 'data' => $appointment], 201);
        } catch (\Exception $e) {
            $code = $e->getCode() === 409 ? 409 : 400;
            return response()->json([
                'status' => 'error',
                'code' => $code === 409 ? 'APPOINTMENT_SLOT_UNAVAILABLE' : 'BOOKING_FAILED',
                'message' => $e->getMessage()
            ], $code);
        }
    }
}
