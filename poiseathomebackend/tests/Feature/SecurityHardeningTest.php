<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_cannot_access_another_customers_payment_proof(): void
    {
        Storage::fake('local');
        $owner = User::factory()->create(['role' => 'customer']);
        $other = User::factory()->create(['role' => 'customer']);
        $appointment = $this->appointmentFor($owner);
        $path = UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf')->store('payment-proofs');
        $payment = AppointmentPayment::create([
            'appointment_id' => $appointment->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 300,
            'proof_path' => $path,
            'status' => 'pending_verification',
            'submitted_at' => now(),
        ]);

        $this->actingAs($other)->get("/api/v1/customer/payments/{$payment->id}/proof")->assertForbidden();
        $this->actingAs($owner)->get("/api/v1/customer/payments/{$payment->id}/proof")->assertOk();
    }

    public function test_confirmation_requires_full_verified_downpayment(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $appointment = $this->appointmentFor($customer, 300);
        AppointmentPayment::create([
            'appointment_id' => $appointment->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 200,
            'status' => 'verified',
            'submitted_at' => now(),
        ]);

        $url = "/api/v1/admin/appointments/{$appointment->id}/status";
        $this->actingAs($admin)->patchJson($url, ['status' => 'confirmed'])->assertUnprocessable();

        AppointmentPayment::create([
            'appointment_id' => $appointment->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 100,
            'status' => 'verified',
            'submitted_at' => now(),
        ]);
        $this->actingAs($admin)->patchJson($url, ['status' => 'confirmed'])->assertOk();
    }

    public function test_customer_cannot_use_report_export_query_to_bypass_rbac(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($customer)->get('/api/v1/admin/reports/appointments?format=csv')->assertForbidden();
        $this->actingAs($customer)->get('/api/v1/admin/reports/appointments?format=pdf')->assertForbidden();
    }

    private function appointmentFor(User $customer, int $required = 300): Appointment
    {
        $staff = User::factory()->create(['role' => 'staff', 'is_active' => true]);
        $staff->profile()->create(['is_available' => true]);
        $category = ServiceCategory::firstOrCreate(['slug' => 'security'], ['name' => 'Security', 'is_active' => true]);
        $service = Service::firstOrCreate(['slug' => 'security-service'], [
            'service_category_id' => $category->id,
            'name' => 'Security Service',
            'duration_minutes' => 60,
            'price' => 1000,
            'is_active' => true,
            'is_home_service' => true,
        ]);

        return Appointment::create([
            'appointment_number' => 'SEC-' . uniqid(),
            'customer_id' => $customer->id,
            'staff_user_id' => $staff->id,
            'service_id' => $service->id,
            'appointment_date' => now()->addDay()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'service_name_snapshot' => $service->name,
            'service_price_snapshot' => 1000,
            'required_downpayment_amount' => $required,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $customer->name,
            'service_address' => 'Test address',
            'status' => 'pending',
        ]);
    }
}
