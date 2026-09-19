<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Appointment;

class AppointmentTest extends TestCase
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

    public function test_customer_can_book_appointment()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        
        $response = $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ]);

        $response->assertStatus(201);
        $appointment = Appointment::where('customer_id', $this->customer->id)->first();
        $this->assertNotNull($appointment);
        $this->assertEquals($this->service->id, $appointment->service_id);
        $this->assertEquals($this->staff->id, $appointment->staff_user_id);
        $this->assertEquals($date, \Carbon\Carbon::parse($appointment->appointment_date)->format('Y-m-d'));
        $this->assertTrue(str_starts_with($appointment->start_time, '10:00'));
        $this->assertTrue(str_starts_with($appointment->end_time, '11:00'));
        $this->assertEquals('pending', $appointment->status);
        $this->assertEquals(500.00, (float) $appointment->service_price_snapshot);
        $this->assertEquals('123 Main St', $appointment->service_address);
    }

    public function test_availability_uses_staff_working_hours()
    {
        $this->staff->profile->update([
            'working_start_time' => '13:00',
            'working_end_time' => '16:00',
        ]);

        $date = now()->addDays(2)->format('Y-m-d');
        $response = $this->actingAs($this->customer)->getJson(
            "/api/v1/booking/availability?service_id={$this->service->id}&staff_id={$this->staff->id}&date={$date}"
        );

        $response->assertOk();
        $starts = collect($response->json('data.slots'))->pluck('start');
        $this->assertSame('13:00', $starts->first());
        $this->assertSame('15:00', $starts->last());
        $this->assertNotContains('09:00', $starts);
    }

    public function test_staff_can_update_working_hours()
    {
        $this->actingAs($this->staff)->putJson('/api/v1/staff/availability', [
            'working_start_time' => '10:00',
            'working_end_time' => '17:30',
        ])->assertOk();

        $profile = $this->staff->fresh()->profile;
        $this->assertTrue(str_starts_with($profile->working_start_time, '10:00'));
        $this->assertTrue(str_starts_with($profile->working_end_time, '17:30'));
    }

    public function test_overlapping_appointments_are_rejected()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        
        // Create first appt 10:00 to 11:00
        Appointment::create([
            'appointment_number' => 'TEST-1',
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $this->service->id,
            'appointment_date' => $date,
            'start_time' => '10:00',
            'end_time' => '11:00',
            'service_name_snapshot' => 'Haircut',
            'service_price_snapshot' => 500,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => 'Cust',
            'service_address' => '123 Main St',
            'status' => 'pending'
        ]);

        // Try booking 10:30
        $response = $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:30',
            'service_address' => '123 Main St',
        ]);

        $response->assertStatus(409);
    }
    public function test_staff_cannot_book_as_customer()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $response = $this->actingAs($this->staff)->postJson('/api/v1/appointments', [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ]);
        $response->assertStatus(403);
    }

    public function test_concurrency_overlap_rejection()
    {
        $date = now()->addDays(3)->format('Y-m-d');
        $payload = [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ];

        $this->actingAs($this->customer)->postJson('/api/v1/appointments', $payload)->assertCreated();
        $secondCustomer = User::factory()->create(['role' => 'customer']);
        $this->actingAs($secondCustomer)->postJson('/api/v1/appointments', $payload)->assertConflict();

        $this->assertEquals(1, Appointment::where('staff_user_id', $this->staff->id)
            ->whereDate('appointment_date', $date)->count());
    }

    public function test_customer_cannot_double_book_overlapping_appointments_across_stylists()
    {
        $otherStaff = User::factory()->create(['role' => 'staff', 'is_active' => true]);
        $otherStaff->profile()->create(['is_available' => true]);
        $otherStaff->services()->attach($this->service->id);

        $date = now()->addDays(3)->format('Y-m-d');
        $payload1 = [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ];
        $payload2 = [
            'service_id' => $this->service->id,
            'staff_id' => $otherStaff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ];

        // First appointment succeeds
        $this->actingAs($this->customer)->postJson('/api/v1/appointments', $payload1)->assertCreated();

        // Same customer trying to book another stylist at the same time fails with conflict (409)
        $this->actingAs($this->customer)->postJson('/api/v1/appointments', $payload2)->assertConflict();

        // Customer's availability also hides the booked slot
        $avail = $this->actingAs($this->customer)->getJson(
            "/api/v1/booking/availability?service_id={$this->service->id}&staff_id={$otherStaff->id}&date={$date}"
        );
        $avail->assertOk();
        $slots = collect($avail->json('data.slots'))->pluck('start');
        $this->assertNotContains('10:00', $slots);
    }

    public function test_booking_uses_snapshots_downpayment_and_safe_numbers()
    {
        config(['poiseathome.payment.downpayment_percentage' => 30]);
        $this->service->update(['price' => 1250]);
        $date = now()->addDays(4)->format('Y-m-d');

        foreach (['10:00', '11:00'] as $time) {
            $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
                'service_id' => $this->service->id,
                'staff_id' => $this->staff->id,
                'date' => $date,
                'start_time' => $time,
                'service_address' => '123 Main St',
            ])->assertCreated();
        }

        $appointments = Appointment::orderBy('id')->get();
        $this->assertSame('375.00', $appointments->first()->required_downpayment_amount);
        $this->assertMatchesRegularExpression('/^PAH-\d{4}-\d{6}$/', $appointments->first()->appointment_number);
        $this->assertNotSame($appointments[0]->appointment_number, $appointments[1]->appointment_number);
    }

    public function test_admin_reassignment_rejects_overlap()
    {
        $otherStaff = User::factory()->create(['role' => 'staff', 'is_active' => true]);
        $otherStaff->profile()->create(['is_available' => true]);
        $otherStaff->services()->attach($this->service->id);
        $date = now()->addDays(5)->format('Y-m-d');

        $existing = $this->makeAppointment($otherStaff, $date, '10:00', '11:00', 'TEST-BUSY');
        $candidate = $this->makeAppointment($this->staff, $date, '10:30', '11:30', 'TEST-MOVE');

        $this->actingAs($this->admin)
            ->patchJson("/api/v1/admin/appointments/{$candidate->id}/staff", ['staff_id' => $otherStaff->id])
            ->assertConflict();
        $this->assertSame($this->staff->id, $candidate->fresh()->staff_user_id);
    }

    public function test_admin_cannot_skip_appointment_lifecycle()
    {
        $appointment = $this->makeAppointment($this->staff, now()->addDays(6)->format('Y-m-d'), '10:00', '11:00', 'TEST-LIFE');
        $this->actingAs($this->admin)
            ->patchJson("/api/v1/admin/appointments/{$appointment->id}/status", ['status' => 'completed'])
            ->assertStatus(400);
        $this->assertSame('pending', $appointment->fresh()->status);
    }

    private function makeAppointment(User $staff, string $date, string $start, string $end, string $number): Appointment
    {
        return Appointment::create([
            'appointment_number' => $number,
            'customer_id' => $this->customer->id,
            'staff_user_id' => $staff->id,
            'service_id' => $this->service->id,
            'appointment_date' => $date,
            'start_time' => $start,
            'end_time' => $end,
            'service_name_snapshot' => $this->service->name,
            'service_price_snapshot' => $this->service->price,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $this->customer->name,
            'service_address' => '123 Main St',
            'status' => 'pending',
        ]);
    }
}
