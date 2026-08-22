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

        $appointment->update([
            'status' => 'cancelled',
            'cancelled_by' => $request->user()->id,
            'cancellation_reason' => $request->input('reason', 'Cancelled by customer'),
            'cancelled_at' => now(),
        ]);

        app(\App\Services\NotificationService::class)->notifyAppointmentCancellation($appointment);

        return response()->json(['status' => 'success', 'data' => $appointment]);
    }
}
