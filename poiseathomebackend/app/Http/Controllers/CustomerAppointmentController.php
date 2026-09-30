<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Services\AppointmentPaymentService;
use Illuminate\Http\Request;

class CustomerAppointmentController extends Controller
{
    protected $paymentService;

    public function __construct(AppointmentPaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function index(Request $request)
    {
        $query = Appointment::where('customer_id', $request->user()->id)
            ->with(['staff.profile', 'service.category'])
            ->orderBy('appointment_date', 'desc')
            ->orderBy('start_time', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $appointments = $query->get()->map(function ($appointment) {
            $appointment->payment_summary = $this->paymentService->getPaymentSummary($appointment);
            return $appointment;
        });

        return response()->json(['status' => 'success', 'data' => $appointments]);
    }

    public function show(Request $request, Appointment $appointment)
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->load(['staff.profile', 'service.category']);
        $appointment->payment_summary = $this->paymentService->getPaymentSummary($appointment);
        return response()->json(['status' => 'success', 'data' => $appointment]);
    }

    public function cancel(Request $request, Appointment $appointment)
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($appointment->status, ['pending', 'confirmed'])) {
            return response()->json(['message' => 'Appointment cannot be cancelled at this stage.'], 400);
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

    public function reschedule(Request $request, Appointment $appointment, \App\Services\AppointmentBookingService $bookingService)
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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
