<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\ServiceCategory;
use App\Models\Service;
use App\Models\Appointment;
use App\Models\StaffDayOff;
use Carbon\Carbon;

class TesterFeedbackPhase3Test extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $staff1;
    protected $staff2;
    protected $customer1;
    protected $customer2;
    protected $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->staff1 = User::factory()->create(['role' => 'staff', 'contact_number' => '09171112222']);
        $this->staff1->profile()->create(['is_available' => true, 'display_name' => 'Stylist Anna', 'specialization' => 'Master Stylist']);

        $this->staff2 = User::factory()->create(['role' => 'staff', 'contact_number' => '09173334444']);
        $this->staff2->profile()->create(['is_available' => true, 'display_name' => 'Stylist Bella', 'specialization' => 'Color Specialist']);

        $this->customer1 = User::factory()->create(['role' => 'customer', 'contact_number' => '09181112222']);
        $this->customer2 = User::factory()->create(['role' => 'customer', 'contact_number' => '09183334444']);

        $category = ServiceCategory::create(['name' => 'Hair Treatments', 'slug' => 'hair-treatments', 'is_active' => true]);
        $this->service = Service::create([
            'service_category_id' => $category->id,
            'name' => 'Signature Hair Spa',
            'slug' => 'signature-hair-spa',
            'duration_minutes' => 60,
            'price' => 1500.00,
            'is_active' => true,
        ]);

        $this->service->qualifiedStaff()->attach([$this->staff1->id, $this->staff2->id]);
    }

    public function test_customer_can_reschedule_appointment_to_available_slot(): void
    {
        $tomorrow = Carbon::now()->addDays(2)->format('Y-m-d');
        $nextWeek = Carbon::now()->addDays(5)->format('Y-m-d');

        $appointment = Appointment::create([
            'appointment_number' => 'APP-TEST-001',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        // Add a verified payment record to ensure payments are preserved
        $appointment->payments()->create([
            'payment_reference' => 'PAY-001',
            'amount' => 500.00,
            'payment_method' => 'gcash',
            'payment_type' => 'downpayment',
            'status' => 'verified',
            'submitted_at' => now(),
            'verified_at' => now(),
        ]);

        $response = $this->actingAs($this->customer1, 'sanctum')->patchJson(
            "/api/v1/customer/appointments/{$appointment->id}/reschedule",
            [
                'date' => $nextWeek,
                'start_time' => '14:00',
            ]
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.appointment_date', $nextWeek);
        $response->assertJsonPath('data.start_time', '14:00:00');
        $response->assertJsonPath('data.end_time', '15:00:00');

        $appointment->refresh();
        $this->assertEquals($nextWeek, $appointment->appointment_date->format('Y-m-d'));
        $this->assertEquals('14:00:00', $appointment->start_time);
        $this->assertEquals(500.00, $appointment->payments()->first()->amount);
    }

    public function test_customer_cannot_reschedule_to_past_date(): void
    {
        $tomorrow = Carbon::now()->addDays(2)->format('Y-m-d');
        $yesterday = Carbon::now()->subDay()->format('Y-m-d');

        $appointment = Appointment::create([
            'appointment_number' => 'APP-TEST-002',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'confirmed',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->customer1, 'sanctum')->patchJson(
            "/api/v1/customer/appointments/{$appointment->id}/reschedule",
            [
                'date' => $yesterday,
                'start_time' => '10:00',
            ]
        );

        $response->assertStatus(422);
    }

    public function test_customer_cannot_reschedule_completed_or_cancelled_appointment(): void
    {
        $tomorrow = Carbon::now()->addDays(2)->format('Y-m-d');
        $nextWeek = Carbon::now()->addDays(5)->format('Y-m-d');

        $completedApp = Appointment::create([
            'appointment_number' => 'APP-TEST-003',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'completed',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->customer1, 'sanctum')->patchJson(
            "/api/v1/customer/appointments/{$completedApp->id}/reschedule",
            [
                'date' => $nextWeek,
                'start_time' => '10:00',
            ]
        );

        $response->assertStatus(400);
        $this->assertStringContainsString('Only pending or confirmed appointments can be rescheduled', $response->json('message'));
    }

    public function test_customer_cannot_reschedule_another_customers_appointment(): void
    {
        $tomorrow = Carbon::now()->addDays(2)->format('Y-m-d');
        $nextWeek = Carbon::now()->addDays(5)->format('Y-m-d');

        $appointment = Appointment::create([
            'appointment_number' => 'APP-TEST-004',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->customer2, 'sanctum')->patchJson(
            "/api/v1/customer/appointments/{$appointment->id}/reschedule",
            [
                'date' => $nextWeek,
                'start_time' => '10:00',
            ]
        );

        $response->assertStatus(403);
    }

    public function test_admin_can_reschedule_appointment_and_change_staff(): void
    {
        $tomorrow = Carbon::now()->addDays(2)->format('Y-m-d');
        $nextWeek = Carbon::now()->addDays(4)->format('Y-m-d');

        $appointment = Appointment::create([
            'appointment_number' => 'APP-TEST-005',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $tomorrow,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson(
            "/api/v1/admin/appointments/{$appointment->id}/reschedule",
            [
                'date' => $nextWeek,
                'start_time' => '11:00',
                'staff_id' => $this->staff2->id,
            ]
        );

        $response->assertStatus(200);
        $response->assertJsonPath('data.staff_user_id', $this->staff2->id);
        $response->assertJsonPath('data.appointment_date', $nextWeek);
        $response->assertJsonPath('data.start_time', '11:00:00');
        $response->assertJsonPath('data.end_time', '12:00:00');
    }

    public function test_reschedule_fails_when_staff_has_overlapping_booking(): void
    {
        $targetDate = Carbon::now()->addDays(3)->format('Y-m-d');

        // Existing booking for staff1 at 10:00 - 11:00 on targetDate
        Appointment::create([
            'appointment_number' => 'APP-EXISTING-001',
            'customer_id' => $this->customer2->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $targetDate,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'confirmed',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer2->name,
            'service_address' => '456 Other St, Manila',
        ]);

        // Customer1 tries to reschedule their appointment into the exact same slot
        $appointment = Appointment::create([
            'appointment_number' => 'APP-TEST-006',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => Carbon::now()->addDays(2)->format('Y-m-d'),
            'start_time' => '14:00:00',
            'end_time' => '15:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->customer1, 'sanctum')->patchJson(
            "/api/v1/customer/appointments/{$appointment->id}/reschedule",
            [
                'date' => $targetDate,
                'start_time' => '10:00',
            ]
        );

        $response->assertStatus(409);
        $this->assertStringContainsString('not available', $response->json('message'));
    }

    public function test_reassign_staff_returns_detailed_conflict_information_when_busy(): void
    {
        $targetDate = Carbon::now()->addDays(3)->format('Y-m-d');

        // Staff 2 already has an appointment from 10:00 to 11:00
        $existingApp = Appointment::create([
            'appointment_number' => 'APP-BUSY-001',
            'customer_id' => $this->customer2->id,
            'staff_user_id' => $this->staff2->id,
            'service_id' => $this->service->id,
            'appointment_date' => $targetDate,
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'confirmed',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer2->name,
            'service_address' => '456 Other St, Manila',
        ]);

        // Appointment assigned to staff 1 at the same time
        $appointmentToReassign = Appointment::create([
            'appointment_number' => 'APP-TO-REASSIGN-001',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $targetDate,
            'start_time' => '10:30:00',
            'end_time' => '11:30:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson(
            "/api/v1/admin/appointments/{$appointmentToReassign->id}/staff",
            [
                'staff_id' => $this->staff2->id,
            ]
        );

        $response->assertStatus(409);
        $message = $response->json('message');
        $this->assertStringContainsString('overlapping appointment', $message);
        $this->assertStringContainsString('APP-BUSY-001', $message);
    }

    public function test_reassign_staff_fails_when_staff_has_approved_day_off(): void
    {
        $targetDate = Carbon::now()->addDays(4)->format('Y-m-d');

        StaffDayOff::create([
            'staff_user_id' => $this->staff2->id,
            'date' => $targetDate,
            'reason' => 'Annual Leave',
            'status' => 'approved',
            'approved_by' => $this->admin->id,
        ]);

        $appointmentToReassign = Appointment::create([
            'appointment_number' => 'APP-TO-REASSIGN-002',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $targetDate,
            'start_time' => '14:00:00',
            'end_time' => '15:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->patchJson(
            "/api/v1/admin/appointments/{$appointmentToReassign->id}/staff",
            [
                'staff_id' => $this->staff2->id,
            ]
        );

        $response->assertStatus(409);
        $this->assertStringContainsString('approved day off', $response->json('message'));
    }

    public function test_availability_service_ignore_appointment_id_allows_same_slot_reselection(): void
    {
        $targetDate = Carbon::now()->addDays(3)->format('Y-m-d');

        $appointment = Appointment::create([
            'appointment_number' => 'APP-SAME-SLOT-001',
            'customer_id' => $this->customer1->id,
            'staff_user_id' => $this->staff1->id,
            'service_id' => $this->service->id,
            'appointment_date' => $targetDate,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'status' => 'pending',
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => $this->service->duration_minutes,
            'customer_name_snapshot' => $this->customer1->name,
            'service_address' => '123 Main St, Manila',
        ]);

        // When checking without ignore_appointment_id, 09:00 slot might not be available
        $resWithoutIgnore = $this->actingAs($this->customer1, 'sanctum')->getJson(
            "/api/v1/booking/availability?staff_id={$this->staff1->id}&date={$targetDate}&service_id={$this->service->id}"
        );
        $resWithoutIgnore->assertStatus(200);
        $slotsWithout = collect($resWithoutIgnore->json('data.slots'))->pluck('start')->toArray();
        $this->assertNotContains('09:00', $slotsWithout);

        // When checking WITH ignore_appointment_id, 09:00 slot IS available to reschedule into
        $resWithIgnore = $this->actingAs($this->customer1, 'sanctum')->getJson(
            "/api/v1/booking/availability?staff_id={$this->staff1->id}&date={$targetDate}&service_id={$this->service->id}&ignore_appointment_id={$appointment->id}"
        );
        $resWithIgnore->assertStatus(200);
        $slotsWith = collect($resWithIgnore->json('data.slots'))->pluck('start')->toArray();
        $this->assertContains('09:00', $slotsWith);
    }
}
