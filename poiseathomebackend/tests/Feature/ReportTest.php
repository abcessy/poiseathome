<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Models\ServiceCategory;
use App\Models\Service;
use App\Models\StaffProfile;

class ReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->staff = User::factory()->create(['role' => 'staff']);
        StaffProfile::create(['user_id' => $this->staff->id, 'display_name' => 'Staff', 'is_available' => true]);
        $this->customer = User::factory()->create(['role' => 'customer']);
    }

    public function test_overview_metrics()
    {
        $sc = ServiceCategory::create(['name' => 'C', 'slug' => 'c', 'is_active' => true]);
        $s = Service::create(['service_category_id' => $sc->id, 'name' => 'S', 'slug' => 's', 'price' => 100, 'duration_minutes' => 60, 'is_active' => true]);
        
        $this->createApp('pending', $s, 100);
        $this->createApp('completed', $s, 150);
        $this->createApp('cancelled', $s, 200);

        $res = $this->actingAs($this->admin)->getJson('/api/v1/admin/reports/overview');
        $res->assertStatus(200);
        
        $this->assertEquals(3, $res->json('data.appointments_total'));
        $this->assertEquals(1, $res->json('data.appointments_pending'));
        $this->assertEquals(1, $res->json('data.appointments_completed'));
        $this->assertEquals(1, $res->json('data.appointments_cancelled'));
        
        // Only completed counts
        $this->assertEquals(150, $res->json('data.completed_service_value'));
    }

    public function test_payment_metrics()
    {
        $app = $this->createApp('pending');
        
        // pending
        AppointmentPayment::create([
            'appointment_id' => $app->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 50,
            'status' => 'pending_verification',
            'submitted_at' => now(),
        ]);

        // verified
        AppointmentPayment::create([
            'appointment_id' => $app->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 200,
            'status' => 'verified',
            'submitted_at' => now(),
        ]);

        // rejected
        AppointmentPayment::create([
            'appointment_id' => $app->id,
            'payment_type' => 'downpayment',
            'payment_method' => 'gcash',
            'amount' => 100,
            'status' => 'rejected',
            'submitted_at' => now(),
        ]);

        $res = $this->actingAs($this->admin)->getJson('/api/v1/admin/reports/overview');
        
        // Only verified
        $this->assertEquals(200, $res->json('data.verified_payment_value'));
        $this->assertEquals(1, $res->json('data.payments_pending'));
    }

    public function test_staff_cannot_access_admin_reports()
    {
        $this->actingAs($this->staff)->getJson('/api/v1/admin/reports/overview')->assertStatus(403);
    }

    public function test_customer_cannot_access_reports()
    {
        $this->actingAs($this->customer)->getJson('/api/v1/admin/reports/overview')->assertStatus(403);
        $this->actingAs($this->customer)->getJson('/api/v1/staff/reports/overview')->assertStatus(403);
    }

    public function test_csv_export_format()
    {
        $this->createApp('pending');
        $res = $this->actingAs($this->admin)->get('/api/v1/admin/reports/appointments?format=csv');
        $res->assertStatus(200);
        $res->assertHeader('Content-type', 'text/csv; charset=UTF-8');
    }

    public function test_pdf_export_format()
    {
        $this->createApp('pending');
        $res = $this->actingAs($this->admin)->get('/api/v1/admin/reports/appointments?format=pdf');
        $res->assertStatus(200);
        $res->assertHeader('Content-type', 'application/pdf');
    }

    protected function createApp($status, $service = null, $price = 100)
    {
        if (!$service) {
            $sc = ServiceCategory::firstOrCreate(['name' => 'C', 'slug' => 'c', 'is_active' => true]);
            $service = Service::firstOrCreate(['service_category_id' => $sc->id, 'name' => 'S', 'slug' => 's', 'price' => 100, 'duration_minutes' => 60, 'is_active' => true]);
        }
        return Appointment::create([
            'appointment_number' => 'APP-' . uniqid(),
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $service->id,
            'appointment_date' => now()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => $status,
            'required_downpayment_amount' => 0,
            'service_name_snapshot' => $service->name,
            'service_price_snapshot' => $price,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => 'Cust',
            'service_address' => 'Addr',
        ]);
    }
}
