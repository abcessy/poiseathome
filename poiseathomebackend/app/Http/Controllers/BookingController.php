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

    public function getStaffForService(Request $request, Service $service)
    {
        $serviceIds = $request->has('service_ids')
            ? (is_array($request->service_ids) ? $request->service_ids : explode(',', $request->service_ids))
            : [$service->id];
        $serviceIds = array_filter(array_map('intval', (array) $serviceIds));
        if (empty($serviceIds)) $serviceIds = [$service->id];

        $services = Service::whereIn('id', $serviceIds)
            ->where('is_active', true)
            ->where('is_home_service', true)
            ->whereHas('category', fn ($q) => $q->where('is_active', true))
            ->get();

        if ($services->count() !== count($serviceIds)) {
            return response()->json(['status' => 'success', 'data' => []]);
        }

        $query = User::where('role', 'staff')
            ->where('is_active', true)
            ->whereHas('profile', fn ($q) => $q->where('is_available', true));

        foreach ($serviceIds as $sId) {
            $query->whereHas('services', fn ($q) => $q->where('services.id', $sId));
        }

        $staff = $query->with('profile')->get()->map(function($user) {
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
            'service_id' => 'nullable|exists:services,id',
            'service_ids' => 'nullable',
            'staff_id' => 'required|exists:users,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'extended_minutes' => 'nullable|integer|min:0|max:180',
            'ignore_appointment_id' => 'nullable|integer|exists:appointments,id',
        ], [
            'date.after_or_equal' => 'Appointment date cannot be in the past.',
        ]);

        $serviceIds = $request->input('service_ids');
        if ($serviceIds) {
            $serviceIds = is_array($serviceIds) ? $serviceIds : explode(',', (string) $serviceIds);
        } else {
            $serviceIds = [$request->input('service_id')];
        }
        $serviceIds = array_filter(array_map('intval', (array) $serviceIds));

        $services = Service::whereIn('id', $serviceIds)
            ->where('is_active', true)
            ->where('is_home_service', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->get();

        if ($services->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Service not found or unavailable.'], 404);
        }

        $staff = User::where('id', $request->staff_id)
            ->where('role', 'staff')
            ->where('is_active', true)
            ->whereHas('profile', fn ($query) => $query->where('is_available', true))
            ->firstOrFail();

        foreach ($serviceIds as $sId) {
            if (!$staff->services()->where('services.id', $sId)->exists()) {
                return response()->json(['status' => 'error', 'message' => 'Hairstylist not qualified for all selected services.'], 422);
            }
        }

        $totalDuration = (int) $services->sum('duration_minutes') + max(0, (int) $request->input('extended_minutes', 0));
        $slots = $this->availabilityService->getAvailableSlots(
            $services->first(),
            $staff,
            $request->date,
            $totalDuration,
            $request->user(),
            $request->input('ignore_appointment_id') ? (int) $request->input('ignore_appointment_id') : null
        );

        return response()->json([
            'status' => 'success',
            'data' => [
                'date' => $request->date,
                'duration_minutes' => $totalDuration,
                'slots' => $slots
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_id' => 'nullable|exists:services,id',
            'service_ids' => 'nullable|array',
            'service_ids.*' => 'exists:services,id',
            'staff_id' => 'required|exists:users,id',
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'start_time' => 'required|date_format:H:i',
            'service_address' => 'required|string',
            'address_notes' => 'nullable|string',
            'customer_notes' => 'nullable|string',
            'extended_minutes' => 'nullable|integer|min:0|max:180',
        ], [
            'date.after_or_equal' => 'Appointment date cannot be in the past.',
        ]);

        $serviceSelection = !empty($validated['service_ids']) ? $validated['service_ids'] : ($validated['service_id'] ?? null);
        if (empty($serviceSelection)) {
            return response()->json(['status' => 'error', 'message' => 'Please select at least one service.'], 422);
        }

        try {
            $appointment = $this->bookingService->createAppointment(
                $request->user()->id,
                $serviceSelection,
                $validated['staff_id'],
                $validated['date'],
                $validated['start_time'],
                $validated['service_address'],
                $validated['address_notes'] ?? null,
                $validated['customer_notes'] ?? null,
                (int) ($validated['extended_minutes'] ?? 0)
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
