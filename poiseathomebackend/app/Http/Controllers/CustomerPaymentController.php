<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Services\AppointmentPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class CustomerPaymentController extends Controller
{
    protected $paymentService;

    public function __construct(AppointmentPaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    public function methods()
    {
        $methods = config('poiseathome.payment.methods', []);
        $enabledMethods = collect($methods)->filter(fn($m) => $m['enabled'])->map(function($m, $key) {
            return [
                'key' => $key,
                'label' => $m['label'],
                'account_name' => $m['account_name'],
                'account_number' => $m['account_number'],
                'bank_name' => $m['bank_name'] ?? null
            ];
        })->values();

        return response()->json(['status' => 'success', 'data' => $enabledMethods]);
    }

    public function index(Request $request, Appointment $appointment)
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $payments = $appointment->payments()->orderBy('created_at', 'desc')->get();
        $summary = $this->paymentService->getPaymentSummary($appointment);

        return response()->json([
            'status' => 'success',
            'data' => [
                'summary' => $summary,
                'history' => $payments
            ]
        ]);
    }

    public function store(Request $request, Appointment $appointment)
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($appointment->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Cannot submit payment for this appointment status.'], 400);
        }

        $summary = $this->paymentService->getPaymentSummary($appointment);

        if ($summary['payment_state'] === 'paid') {
            return response()->json(['message' => 'Appointment is already fully paid.'], 400);
        }

        if ($summary['payment_state'] === 'pending_verification') {
            return response()->json(['message' => 'A payment is already pending verification.'], 400);
        }

        $validated = $request->validate([
            'payment_method' => 'required|string',
            'amount' => 'required|numeric|min:0.01',
            'reference_number' => 'nullable|string|max:255',
            'proof' => 'required|file|mimes:jpeg,png,webp,pdf|max:5120', // 5MB
        ]);

        $method = config('poiseathome.payment.methods.' . $validated['payment_method']);
        if (!$method || !($method['enabled'] ?? false)) {
            return response()->json(['message' => 'The selected payment method is not available.'], 422);
        }

        if ($validated['amount'] < $summary['remaining_required_downpayment']) {
            return response()->json(['message' => 'Amount must cover the remaining required downpayment.'], 400);
        }

        $remainingTotal = $summary['service_price'] - $summary['verified_amount'];
        if ($validated['amount'] > $remainingTotal) {
            return response()->json(['message' => 'Amount exceeds the remaining service total.'], 400);
        }

        $path = $request->file('proof')->store('payment-proofs');

        try {
            $payment = DB::transaction(function () use ($appointment, $validated, $path) {
                $lockedAppointment = Appointment::whereKey($appointment->id)->lockForUpdate()->firstOrFail();
                $lockedSummary = $this->paymentService->getPaymentSummary($lockedAppointment);

                if ($lockedSummary['payment_state'] === 'pending_verification') {
                    throw new \RuntimeException('A payment is already pending verification.');
                }
                if ($validated['amount'] < $lockedSummary['remaining_required_downpayment']) {
                    throw new \RuntimeException('Amount must cover the remaining required downpayment.');
                }
                if ($validated['amount'] > ($lockedSummary['service_price'] - $lockedSummary['verified_amount'])) {
                    throw new \RuntimeException('Amount exceeds the remaining service total.');
                }

                return AppointmentPayment::create([
                    'appointment_id' => $lockedAppointment->id,
                    'payment_type' => 'downpayment',
                    'payment_method' => $validated['payment_method'],
                    'amount' => $validated['amount'],
                    'reference_number' => $validated['reference_number'] ?? null,
                    'proof_path' => $path,
                    'status' => 'pending_verification',
                    'submitted_at' => now(),
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::delete($path);
            return response()->json(['message' => $exception->getMessage()], 409);
        }

        $ns = app(\App\Services\NotificationService::class);
        $ns->notifyUser($request->user(), [
            'type' => 'payment_submitted',
            'title' => 'Payment Submitted',
            'message' => 'Your payment for appointment ' . $appointment->appointment_number . ' has been submitted for verification.',
            'reference_type' => 'appointment',
            'reference_code' => $appointment->appointment_number,
        ]);
        
        $ns->notifyAdmins([
            'type' => 'payment_submitted',
            'title' => 'New Payment requires review',
            'message' => 'A payment for appointment ' . $appointment->appointment_number . ' requires verification.',
            'reference_type' => 'payment',
            'reference_id' => $payment->id,
        ]);

        return response()->json(['status' => 'success', 'data' => $payment], 201);
    }

    public function getProof(Request $request, AppointmentPayment $payment)
    {
        if ($payment->appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!Storage::exists($payment->proof_path)) {
            return response()->json(['message' => 'Proof not found.'], 404);
        }

        return Storage::download($payment->proof_path);
    }
}
