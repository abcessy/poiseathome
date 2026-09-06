<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Services\AppointmentPaymentService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class StaffAppointmentController extends Controller
{
    protected $paymentService;

    public function __construct(AppointmentPaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function index(Request $request)
    {
        $query = Appointment::where('staff_user_id', $request->user()->id)
            ->with(['customer', 'service'])
            ->orderBy('appointment_date', 'asc')
            ->orderBy('start_time', 'asc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('date')) {
            $query->whereDate('appointment_date', $request->date);
        }
        
        $appointments = $query->get()->map(function ($app) {
            $app->payment_summary = $this->paymentService->getPaymentSummary($app);
            return $app;
        });

        return response()->json(['status' => 'success', 'data' => $appointments]);
    }

    public function show(Request $request, Appointment $appointment)
    {
        if ($appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->load(['customer', 'service']);
        $appointment->payment_summary = $this->paymentService->getPaymentSummary($appointment);
        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function updateStatus(Request $request, Appointment $appointment)
    {
        if ($appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:confirmed,in_progress,completed'
        ]);

        $newStatus = $validated['status'];
        $currentStatus = $appointment->status;

        $valid = false;
        if ($currentStatus === 'pending' && $newStatus === 'confirmed') $valid = true;
        if ($currentStatus === 'confirmed' && $newStatus === 'in_progress') $valid = true;
        if ($currentStatus === 'in_progress' && $newStatus === 'completed') $valid = true;

        if (!$valid) {
            return response()->json(['message' => "Invalid status transition from {$currentStatus} to {$newStatus}."], 400);
        }

        // CONFIRMATION GUARD
        if ($newStatus === 'confirmed') {
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
        if ($newStatus === 'confirmed') $updates['confirmed_at'] = now();
        if ($newStatus === 'in_progress') $updates['started_at'] = now();
        if ($newStatus === 'completed') $updates['completed_at'] = now();

        $appointment->update($updates);

        if ($currentStatus !== $newStatus) {
            app(\App\Services\NotificationService::class)->notifyAppointmentStatusChange($appointment);
        }

        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        if ($appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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

    public function extendTime(Request $request, Appointment $appointment)
    {
        if ($appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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
            'internal_notes' => trim(($appointment->internal_notes ? $appointment->internal_notes . "\n" : '') . "Staff extended time by {$minutes} min on " . now()->format('M d, Y H:i') . ($request->reason ? " (Reason: {$request->reason})" : '')),
        ]);

        app(\App\Services\NotificationService::class)->notifyUser($appointment->customer, [
            'type' => 'appointment_updated',
            'title' => 'Appointment Extended',
            'message' => "Your stylist has extended appointment {$appointment->appointment_number} by {$minutes} minutes.",
            'reference_type' => 'appointment',
            'reference_code' => $appointment->appointment_number,
        ]);

        app(\App\Services\NotificationService::class)->notifyAdmins([
            'type' => 'appointment_updated',
            'title' => 'Appointment Extended by Staff',
            'message' => "Appointment {$appointment->appointment_number} was extended by {$minutes} minutes by staff {$request->user()->name}.",
            'reference_type' => 'appointment',
            'reference_id' => $appointment->id,
        ]);

        return response()->json(['status' => 'success', 'data' => $appointment->fresh(['customer', 'service'])]);
    }
}
