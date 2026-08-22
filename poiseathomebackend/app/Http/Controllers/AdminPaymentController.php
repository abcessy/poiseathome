<?php

namespace App\Http\Controllers;

use App\Models\AppointmentPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = AppointmentPayment::with(['appointment.customer', 'appointment.service'])
            ->orderBy('submitted_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        return response()->json(['status' => 'success', 'data' => $query->get()]);
    }

    public function show(AppointmentPayment $payment)
    {
        $payment->load(['appointment.customer', 'appointment.service', 'verifier']);
        return response()->json(['status' => 'success', 'data' => $payment]);
    }

    public function getProof(AppointmentPayment $payment)
    {
        if (!Storage::exists($payment->proof_path)) {
            return response()->json(['message' => 'Proof not found.'], 404);
        }

        return Storage::download($payment->proof_path);
    }

    public function approve(Request $request, AppointmentPayment $payment)
    {
        try {
            DB::transaction(function () use ($payment, $request) {
                $payment = AppointmentPayment::where('id', $payment->id)->lockForUpdate()->first();
                
                if ($payment->status !== 'pending_verification') {
                    throw new \Exception("Payment is not pending verification.");
                }

                $payment->update([
                    'status' => 'verified',
                    'verified_by' => $request->user()->id,
                    'verified_at' => now(),
                    'rejection_reason' => null
                ]);
            });
            
            app(\App\Services\NotificationService::class)->notifyUser($payment->appointment->customer, [
                'type' => 'payment_verified',
                'title' => 'Downpayment Verified',
                'message' => 'Your payment for appointment ' . $payment->appointment->appointment_number . ' has been verified.',
                'reference_type' => 'appointment',
                'reference_code' => $payment->appointment->appointment_number,
            ]);

            return response()->json(['status' => 'success', 'data' => $payment->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }

    public function reject(Request $request, AppointmentPayment $payment)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:1000'
        ]);

        try {
            DB::transaction(function () use ($payment, $validated) {
                $payment = AppointmentPayment::where('id', $payment->id)->lockForUpdate()->first();
                
                if ($payment->status !== 'pending_verification') {
                    throw new \Exception("Payment is not pending verification.");
                }

                $payment->update([
                    'status' => 'rejected',
                    'rejection_reason' => $validated['reason']
                ]);
            });

            app(\App\Services\NotificationService::class)->notifyUser($payment->appointment->customer, [
                'type' => 'payment_rejected',
                'title' => 'Payment Proof Rejected',
                'message' => 'Your payment proof for appointment ' . $payment->appointment->appointment_number . ' was rejected. Open your appointment to view the reason and submit a new proof.',
                'reference_type' => 'appointment',
                'reference_code' => $payment->appointment->appointment_number,
            ]);

            return response()->json(['status' => 'success', 'data' => $payment->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
