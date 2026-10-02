<?php

namespace App\Services;

use App\Models\Appointment;

class AppointmentPaymentService
{
    public function getPaymentSummary(Appointment $appointment)
    {
        $requiredDownpayment = $appointment->required_downpayment_amount;
        $servicePrice = $appointment->service_price_snapshot;

        $verifiedAmount = $appointment->payments()->where("status", "verified")->sum("amount");
        
        $hasPending = $appointment->payments()->where("status", "pending_verification")->exists();
        
        $remainingDownpayment = max(0, $requiredDownpayment - $verifiedAmount);
        $remainingBalance = max(0, $servicePrice - $verifiedAmount);

        $state = "unpaid";
        if ($verifiedAmount >= $servicePrice) {
            $state = "paid";
        } elseif ($verifiedAmount > 0) {
            $state = "partially_paid";
        } elseif ($hasPending) {
            $state = "pending_verification";
        }

        return [
            "service_price" => (string) number_format($servicePrice, 2, ".", ""),
            "required_downpayment" => (string) number_format($requiredDownpayment, 2, ".", ""),
            "verified_amount" => (string) number_format($verifiedAmount, 2, ".", ""),
            "remaining_required_downpayment" => (string) number_format($remainingDownpayment, 2, ".", ""),
            "remaining_balance" => (string) number_format($remainingBalance, 2, ".", ""),
            "payment_state" => $state,
        ];
    }
}
