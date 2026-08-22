<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\User;
use App\Services\AppointmentPaymentService;
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

        $appointment->update([
            'status' => 'cancelled',
            'cancelled_by' => $request->user()->id,
            'cancellation_reason' => $request->input('reason', 'Cancelled by admin'),
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
                    throw new \RuntimeException('Staff member is not available.');
                }
                if (!$newStaff->services()->where('service_id', $appointment->service_id)->exists()) {
                    throw new \RuntimeException('Staff member is not qualified for this service.');
                }
                if ($newStaff->daysOff()->whereDate('date', $appointment->appointment_date)->exists()) {
                    throw new \RuntimeException('Staff member is on a day off for this date.');
                }

                $hasConflict = Appointment::where('staff_user_id', $newStaff->id)
                    ->whereKeyNot($appointment->id)
                    ->whereDate('appointment_date', $appointment->appointment_date)
                    ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                    ->where('start_time', '<', $appointment->end_time)
                    ->where('end_time', '>', $appointment->start_time)
                    ->lockForUpdate()
                    ->exists();
                if ($hasConflict) {
                    throw new \RuntimeException('Staff member has an overlapping appointment.');
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
}
