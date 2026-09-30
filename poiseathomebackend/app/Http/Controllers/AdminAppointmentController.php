<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use App\Services\AppointmentPaymentService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAppointmentController extends Controller
{
    protected $paymentService;

    public function __construct(AppointmentPaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function index(Request $request)
    {
        $query = Appointment::with(['customer', 'staff.profile', 'service'])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('date')) {
            $query->whereDate('appointment_date', $request->date);
        }
        if ($request->has('staff_id')) {
            $query->where('staff_user_id', $request->staff_id);
        }

        $appointments = $query->get()->map(function ($app) {
            $app->payment_summary = $this->paymentService->getPaymentSummary($app);
            return $app;
        });

        return response()->json(['status' => 'success', 'data' => $appointments]);
    }

    public function show(Appointment $appointment)
    {
        $appointment->load(['customer', 'staff.profile', 'service', 'canceller']);
        $appointment->payment_summary = $this->paymentService->getPaymentSummary($appointment);
        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function updateStatus(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'status' => 'required|in:pending,confirmed,in_progress,completed'
        ]);

        $newStatus = $validated['status'];
        $currentStatus = $appointment->status;

        $transitions = [
            'pending' => ['confirmed'],
            'confirmed' => ['in_progress'],
            'in_progress' => ['completed'],
            'completed' => [],
            'cancelled' => [],
        ];
        if ($newStatus !== $currentStatus && !in_array($newStatus, $transitions[$currentStatus] ?? [], true)) {
            return response()->json(['message' => "Invalid status transition from {$currentStatus} to {$newStatus}."], 400);
        }

        // CONFIRMATION GUARD
        if ($newStatus === 'confirmed' && $currentStatus === 'pending') {
            $verifiedPayment = $appointment->payments()->where('status', 'verified')->sum('amount');
            if ($verifiedPayment < $appointment->required_downpayment_amount) {
                return response()->json([
                    'status' => 'error',
                    'code' => 'DOWNPAYMENT_NOT_VERIFIED',
                    'message' => 'The required downpayment must be verified before this appointment can be confirmed.'
                ], 422);
            }
        }

        $updates = ['status' => $newStatus];
        if ($newStatus === 'confirmed' && !$appointment->confirmed_at) $updates['confirmed_at'] = now();
        if ($newStatus === 'in_progress' && !$appointment->started_at) $updates['started_at'] = now();
        if ($newStatus === 'completed' && !$appointment->completed_at) $updates['completed_at'] = now();

        $appointment->update($updates);

        if ($currentStatus !== $newStatus) {
            app(\App\Services\NotificationService::class)->notifyAppointmentStatusChange($appointment);
        }

        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        if (in_array($appointment->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => "Cannot cancel a {$appointment->status} appointment."], 400);
        }

        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ], [
            'reason.required' => 'A cancellation reason is required.',
            'reason.min' => 'Please provide a cancellation reason with at least 3 characters.',
        ]);

        $appointment->update([
            'status' => 'cancelled',
            'cancelled_by' => $request->user()->id,
            'cancellation_reason' => $validated['reason'],
            'cancelled_at' => now(),
        ]);

        app(\App\Services\NotificationService::class)->notifyAppointmentCancellation($appointment);

        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function reassignStaff(Request $request, Appointment $appointment)
    {
        $validated = $request->validate([
            'staff_id' => 'required|exists:users,id'
        ]);

        if (in_array($appointment->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => "Cannot reassign a {$appointment->status} appointment."], 400);
        }

        try {
            [$appointment, $newStaff, $oldStaffId] = DB::transaction(function () use ($appointment, $validated) {
                $appointment = Appointment::whereKey($appointment->id)->lockForUpdate()->firstOrFail();
                $newStaff = User::whereKey($validated['staff_id'])
                    ->where('role', 'staff')
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (!$newStaff || !$newStaff->profile?->is_available) {
                    throw new \RuntimeException('The selected staff member is currently set as unavailable in their profile.');
                }
                if (!$newStaff->services()->where('service_id', $appointment->service_id)->exists()) {
                    throw new \RuntimeException('The selected staff member is not qualified to perform ' . $appointment->service_name_snapshot . '.');
                }
                if ($newStaff->daysOff()->whereDate('date', $appointment->appointment_date)->exists()) {
                    throw new \RuntimeException('The selected staff member has an approved day off on ' . $appointment->appointment_date . '.');
                }

                $conflict = Appointment::where('staff_user_id', $newStaff->id)
                    ->whereKeyNot($appointment->id)
                    ->whereDate('appointment_date', $appointment->appointment_date)
                    ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                    ->where('start_time', '<', $appointment->end_time)
                    ->where('end_time', '>', $appointment->start_time)
                    ->lockForUpdate()
                    ->first();
                if ($conflict) {
                    throw new \RuntimeException("The selected staff member already has an overlapping appointment ({$conflict->appointment_number}, {$conflict->start_time} - {$conflict->end_time}) on this date.");
                }

                $oldStaffId = $appointment->staff_user_id;
                $appointment->update(['staff_user_id' => $newStaff->id]);
                return [$appointment, $newStaff, $oldStaffId];
            });
        } catch (\RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        $ns = app(\App\Services\NotificationService::class);
        $ns->notifyStaff($newStaff, [
            'type' => 'appointment_reassigned',
            'title' => 'New Appointment Assigned',
            'message' => 'You have been assigned to appointment ' . $appointment->appointment_number . '.',
            'reference_type' => 'appointment',
            'reference_id' => $appointment->id,
        ]);

        if ($oldStaffId && $oldStaffId !== $newStaff->id) {
            $ns->notifyStaff(User::find($oldStaffId), [
                'type' => 'appointment_reassigned',
                'title' => 'Appointment Assignment Updated',
                'message' => 'Appointment ' . $appointment->appointment_number . ' is no longer assigned to you.',
                'reference_type' => 'appointment',
                'reference_id' => $appointment->id,
            ]);
        }

        return response()->json(['status' => 'success', 'data' => $appointment->load('staff.profile')]);
    }

    public function extendTime(Request $request, Appointment $appointment)
    {
        if (in_array($appointment->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => "Cannot extend a {$appointment->status} appointment."], 400);
        }

        $validated = $request->validate([
            'minutes' => 'required|integer|min:15|max:180',
            'reason' => 'nullable|string|max:500',
        ]);

        $minutes = (int) $validated['minutes'];
        $tz = config('app.timezone', 'Asia/Manila');

        $dateStr = Carbon::parse($appointment->appointment_date)->format('Y-m-d');
        $currentEnd = Carbon::parse($dateStr . ' ' . $appointment->end_time, $tz);
        $newEnd = $currentEnd->copy()->addMinutes($minutes);

        // Check subsequent appointment conflict
        $conflict = Appointment::where('staff_user_id', $appointment->staff_user_id)
            ->whereKeyNot($appointment->id)
            ->whereDate('appointment_date', $appointment->appointment_date)
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->where('start_time', '<', $newEnd->format('H:i:s'))
            ->where('end_time', '>', $currentEnd->format('H:i:s'))
            ->lockForUpdate()
            ->first();

        if ($conflict) {
            return response()->json([
                'status' => 'error',
                'code' => 'SCHEDULE_CONFLICT',
                'message' => "Extending by {$minutes} minutes conflicts with upcoming appointment {$conflict->appointment_number} scheduled at " . substr($conflict->start_time, 0, 5) . "."
            ], 409);
        }

        $appointment->update([
            'end_time' => $newEnd->format('H:i:s'),
            'extended_minutes' => ($appointment->extended_minutes ?? 0) + $minutes,
            'service_duration_minutes_snapshot' => $appointment->service_duration_minutes_snapshot + $minutes,
            'internal_notes' => trim(($appointment->internal_notes ? $appointment->internal_notes . "\n" : '') . "Time extended by {$minutes} min on " . now()->format('M d, Y H:i') . ($request->reason ? " (Reason: {$request->reason})" : '')),
        ]);

        app(\App\Services\NotificationService::class)->notifyUser($appointment->customer, [
            'type' => 'appointment_updated',
            'title' => 'Appointment Extended',
            'message' => "Your appointment {$appointment->appointment_number} duration has been extended by {$minutes} minutes.",
            'reference_type' => 'appointment',
            'reference_code' => $appointment->appointment_number,
        ]);

        return response()->json(['status' => 'success', 'data' => $appointment->fresh(['customer', 'staff.profile', 'service'])]);
    }

    public function reschedule(Request $request, Appointment $appointment, \App\Services\AppointmentBookingService $bookingService)
    {
        $validated = $request->validate([
            'date' => 'required|date_format:Y-m-d|after_or_equal:today',
            'start_time' => 'required|string',
            'staff_id' => 'nullable|exists:users,id',
        ], [
            'date.after_or_equal' => 'Appointment date cannot be in the past.',
        ]);

        try {
            $updated = $bookingService->rescheduleAppointment(
                $appointment,
                $validated['date'],
                $validated['start_time'],
                $validated['staff_id'] ?? null,
                $request->user()
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Appointment rescheduled successfully.',
                'data' => $updated,
            ]);
        } catch (\Exception $e) {
            $code = in_array($e->getCode(), [400, 403, 404, 409, 422]) ? $e->getCode() : 422;
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], $code);
        }
    }
}
