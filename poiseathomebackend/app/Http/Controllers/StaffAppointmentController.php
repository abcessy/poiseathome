<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Services\AppointmentPaymentService;
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
}
