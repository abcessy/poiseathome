<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Services\AppointmentPaymentService;

class TesterFeedbackPhase1Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->category = ServiceCategory::create(['name' => 'Hair', 'slug' => 'hair', 'is_active' => true]);
        $this->service = Service::create([
            'service_category_id' => $this->category->id,
            'name' => 'Haircut',
            'slug' => 'haircut',
            'duration_minutes' => 60,
            'price' => 500,
            'is_home_service' => true,
            'is_active' => true,
        ]);

        $this->staff = User::factory()->create(['role' => 'staff', 'is_active' => true]);
        $this->staff->profile()->create(['is_available' => true]);
        $this->staff->services()->attach($this->service->id);

        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->admin = User::factory()->create(['role' => 'admin']);
    }

    public function test_booking_past_date_is_rejected()
    {
        $pastDate = now()->subDays(1)->format('Y-m-d');

        $response = $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $pastDate,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['date']);
    }

    public function test_staff_can_cancel_via_patch_and_post()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $appointment1 = Appointment::create([
            'appointment_number' => 'PAH-2026-000001',
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $this->service->id,
            'appointment_date' => $date,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'required_downpayment_amount' => 150.00,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $this->customer->name,
            'customer_contact_snapshot' => '09123456789',
            'service_address' => '123 Main St',
            'status' => 'pending',
        ]);

        $appointment2 = Appointment::create([
            'appointment_number' => 'PAH-2026-000002',
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $this->service->id,
            'appointment_date' => $date,
            'start_time' => '13:00:00',
            'end_time' => '14:00:00',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'required_downpayment_amount' => 150.00,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $this->customer->name,
            'customer_contact_snapshot' => '09123456789',
            'service_address' => '123 Main St',
            'status' => 'pending',
        ]);

        // Test POST cancellation (matching StaffAppointmentDetail.jsx)
        $resPost = $this->actingAs($this->staff)->postJson("/api/v1/staff/appointments/{$appointment1->id}/cancel", [
            'reason' => 'Staff emergency conflict via post',
        ]);
        $resPost->assertStatus(200);
        $this->assertEquals('cancelled', $appointment1->fresh()->status);

        // Test PATCH cancellation (matching REST route)
        $resPatch = $this->actingAs($this->staff)->patchJson("/api/v1/staff/appointments/{$appointment2->id}/cancel", [
            'reason' => 'Staff schedule conflict via patch',
        ]);
        $resPatch->assertStatus(200);
        $this->assertEquals('cancelled', $appointment2->fresh()->status);
    }

    public function test_payment_summary_calculates_correct_remaining_balance_and_downpayment()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $appointment = Appointment::create([
            'appointment_number' => 'PAH-2026-000002',
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $this->service->id,
            'appointment_date' => $date,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => 500.00,
            'required_downpayment_amount' => 150.00,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $this->customer->name,
            'customer_contact_snapshot' => '09123456789',
            'service_address' => '123 Main St',
            'status' => 'pending',
        ]);

        $paymentService = app(AppointmentPaymentService::class);

        // Before any payment:
        // Service price: 500.00, Required downpayment: 150.00, Remaining downpayment: 150.00, Remaining total balance: 500.00
        $summaryUnpaid = $paymentService->getPaymentSummary($appointment);
        $this->assertEquals('500.00', $summaryUnpaid['service_price']);
        $this->assertEquals('150.00', $summaryUnpaid['required_downpayment']);
        $this->assertEquals('0.00', $summaryUnpaid['verified_amount']);
        $this->assertEquals('150.00', $summaryUnpaid['remaining_required_downpayment']);
        $this->assertEquals('500.00', $summaryUnpaid['remaining_balance']);
        $this->assertEquals('unpaid', $summaryUnpaid['payment_state']);

        // After verified downpayment of 150.00:
        // Remaining downpayment: 0.00, Remaining total balance: 350.00 (not 150.00!)
        AppointmentPayment::create([
            'appointment_id' => $appointment->id,
            'amount' => 150.00,
            'payment_method' => 'gcash',
            'status' => 'verified',
            'submitted_at' => now(),
            'verified_at' => now(),
            'verified_by' => $this->admin->id,
        ]);

        $summaryPaid = $paymentService->getPaymentSummary($appointment);
        $this->assertEquals('150.00', $summaryPaid['verified_amount']);
        $this->assertEquals('0.00', $summaryPaid['remaining_required_downpayment']);
        $this->assertEquals('350.00', $summaryPaid['remaining_balance']);
        $this->assertEquals('partially_paid', $summaryPaid['payment_state']);
    }

    public function test_appointment_date_serializes_as_exact_ymd_string()
    {
        $appointment = new Appointment([
            'appointment_date' => '2026-10-10',
        ]);

        $array = $appointment->toArray();
        $this->assertEquals('2026-10-10', $array['appointment_date']);
        $this->assertStringNotContainsString('T', $array['appointment_date']);
    }
}
