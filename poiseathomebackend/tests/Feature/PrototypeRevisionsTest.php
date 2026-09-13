<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\AppointmentProductUsage;
use App\Models\CustomerReview;
use App\Models\Notification;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StaffProfile;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrototypeRevisionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $staff;
    protected User $customer;
    protected ServiceCategory $category;
    protected Service $service1;
    protected Service $service2;
    protected ProductCategory $prodCategory;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $this->staff = User::factory()->create(['role' => 'staff', 'is_active' => true]);
        StaffProfile::create([
            'user_id' => $this->staff->id,
            'display_name' => 'Stylist Angela',
            'is_available' => true,
            'working_start_time' => '09:00',
            'working_end_time' => '18:00',
        ]);

        $this->customer = User::factory()->create(['role' => 'customer', 'is_active' => true]);

        $this->category = ServiceCategory::create(['name' => 'Hair Care', 'slug' => 'hair-care', 'is_active' => true]);
        $this->service1 = Service::create([
            'service_category_id' => $this->category->id,
            'name' => 'Signature Haircut',
            'slug' => 'signature-haircut',
            'duration_minutes' => 60,
            'price' => 500,
            'is_home_service' => true,
            'is_active' => true,
        ]);
        $this->service2 = Service::create([
            'service_category_id' => $this->category->id,
            'name' => 'Keratin Treatment',
            'slug' => 'keratin-treatment',
            'duration_minutes' => 90,
            'price' => 1500,
            'is_home_service' => true,
            'is_active' => true,
        ]);

        $this->staff->services()->attach([$this->service1->id, $this->service2->id]);

        $this->prodCategory = ProductCategory::create(['name' => 'Shampoo', 'slug' => 'shampoo', 'is_active' => true]);
        $this->product = Product::create([
            'product_category_id' => $this->prodCategory->id,
            'sku' => 'SHP-001',
            'name' => 'Keratin Shampoo',
            'unit' => 'bottle',
            'cost_price' => 250,
            'low_stock_threshold' => 3,
            'is_active' => true,
        ]);
        $this->product->inventory()->create(['available_quantity' => 20]);
    }

    // Sir Prado #1: Overlap handling and capacity
    public function test_prado_overlapping_bookings_are_rejected_with_conflict(): void
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $payload = [
            'service_id' => $this->service1->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ];

        // First customer books successfully
        $this->actingAs($this->customer)->postJson('/api/v1/appointments', $payload)->assertStatus(201);

        // Second customer tries to book the same stylist at the same time
        $secondCustomer = User::factory()->create(['role' => 'customer', 'is_active' => true]);
        $res = $this->actingAs($secondCustomer)->postJson('/api/v1/appointments', $payload);
        $res->assertStatus(409);
    }

    // Sir Prado #2: Scheduling extend-time feature
    public function test_prado_booking_with_extended_minutes_calculates_correct_duration(): void
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $res = $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
            'service_id' => $this->service1->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
            'extended_minutes' => 30,
        ]);

        $res->assertStatus(201);
        $appointment = Appointment::latest('id')->first();
        $this->assertEquals(30, $appointment->extended_minutes);
        $this->assertEquals(90, $appointment->service_duration_minutes_snapshot); // 60 + 30
        $this->assertTrue(str_starts_with($appointment->start_time, '10:00'));
        $this->assertTrue(str_starts_with($appointment->end_time, '11:30'));
    }

    public function test_prado_staff_and_admin_can_extend_active_appointment(): void
    {
        $appointment = $this->createAppointment('in_progress', '10:00', '11:00');

        // Staff extends by 30 mins
        $res = $this->actingAs($this->staff)->postJson("/api/v1/staff/appointments/{$appointment->id}/extend-time", [
            'minutes' => 30,
            'reason' => 'Thick hair requires additional blow dry time',
        ]);

        $res->assertOk();
        $fresh = $appointment->fresh();
        $this->assertEquals(30, $fresh->extended_minutes);
        $this->assertTrue(str_starts_with($fresh->end_time, '11:30'));

        // Customer & Admin notifications verified
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customer->id,
            'type' => 'appointment_updated',
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'appointment_updated',
        ]);
    }

    // Sir Jasz #3 & #4: Rating after service and multi-category rating
    public function test_jasz_customer_can_rate_completed_appointment_with_stylist_and_shop_categories(): void
    {
        $appointment = $this->createAppointment('completed', '10:00', '11:00');

        // Rating a non-completed appointment should fail
        $pendingApp = $this->createAppointment('pending', '14:00', '15:00');
        $this->actingAs($this->customer)->postJson("/api/v1/customer/appointments/{$pendingApp->id}/review", [
            'stylist_rating' => 5,
            'shop_rating' => 5,
        ])->assertStatus(400);

        // Rating completed appointment succeeds with separate ratings
        $res = $this->actingAs($this->customer)->postJson("/api/v1/customer/appointments/{$appointment->id}/review", [
            'stylist_rating' => 5,
            'shop_rating' => 4,
            'comment' => 'Stylist Angela was brilliant, very polite and punctual salon service.',
        ]);

        $res->assertOk();
        $this->assertDatabaseHas('customer_reviews', [
            'appointment_id' => $appointment->id,
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'stylist_rating' => 5,
            'shop_rating' => 4,
            'rating' => 5, // (5 + 4) / 2 rounded
        ]);

        // Public review summary exposes all category averages
        $publicRes = $this->getJson('/api/v1/reviews');
        $publicRes->assertOk();
        $this->assertEquals(5, $publicRes->json('data.summary.stylist_average'));
        $this->assertEquals(4, $publicRes->json('data.summary.shop_average'));
    }

    // Maam Jessa #5: Staff inventory access and product usage
    public function test_jessa_staff_can_view_inventory_without_cost_price_and_adjust_stock(): void
    {
        $this->actingAs($this->staff);

        // View inventory
        $res = $this->getJson('/api/v1/staff/inventory');
        $res->assertOk();
        $item = collect($res->json('data'))->firstWhere('id', $this->product->id);
        $this->assertNotNull($item);
        $this->assertArrayNotHasKey('cost_price', $item);

        // Staff stock-in
        $this->postJson("/api/v1/staff/inventory/{$this->product->id}/stock-in", [
            'quantity' => 5,
            'notes' => 'Replenished from main warehouse',
        ])->assertOk();
        $this->assertEquals(25, $this->product->fresh()->inventory->available_quantity);

        // Staff stock-out
        $this->postJson("/api/v1/staff/inventory/{$this->product->id}/stock-out", [
            'quantity' => 2,
            'notes' => 'Damaged bottle',
        ])->assertOk();
        $this->assertEquals(23, $this->product->fresh()->inventory->available_quantity);
    }

    public function test_jessa_staff_can_log_and_reverse_appointment_product_usage(): void
    {
        $appointment = $this->createAppointment('in_progress', '10:00', '11:00');

        // Record usage
        $res = $this->actingAs($this->staff)->postJson("/api/v1/staff/appointments/{$appointment->id}/product-usages", [
            'product_id' => $this->product->id,
            'quantity' => 2,
            'notes' => 'Used 2 bottles during hair treatment',
        ]);
        $res->assertOk();
        $this->assertEquals(18, $this->product->fresh()->inventory->available_quantity);

        $usage = AppointmentProductUsage::latest('id')->first();
        $this->assertNotNull($usage);

        // Reverse usage
        $revRes = $this->actingAs($this->staff)->postJson("/api/v1/staff/appointments/{$appointment->id}/product-usages/{$usage->id}/reverse", [
            'reason' => 'Logged excessive quantity by mistake',
        ]);
        $revRes->assertOk();
        $this->assertEquals(20, $this->product->fresh()->inventory->available_quantity);
    }

    // Maam Jessa #6: Multi-service scheduling
    public function test_jessa_multiple_services_can_be_booked_together(): void
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $res = $this->actingAs($this->customer)->postJson('/api/v1/appointments', [
            'service_ids' => [$this->service1->id, $this->service2->id],
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ]);

        $res->assertStatus(201);
        $appointment = Appointment::latest('id')->first();
        $this->assertEquals(150, $appointment->service_duration_minutes_snapshot); // 60 + 90
        $this->assertEquals(2000, (float) $appointment->service_price_snapshot); // 500 + 1500
        $this->assertCount(2, $appointment->additional_services);
        $this->assertTrue(str_starts_with($appointment->start_time, '10:00'));
        $this->assertTrue(str_starts_with($appointment->end_time, '12:30'));
    }

    // Maam Jessa #8 & #9: Cancellation reason required and notifies admin
    public function test_jessa_cancellation_requires_reason_and_notifies_admin(): void
    {
        $appointment = $this->createAppointment('pending', '10:00', '11:00');

        // Cancellation fails without reason
        $this->actingAs($this->customer)->postJson("/api/v1/customer/appointments/{$appointment->id}/cancel", [
            'reason' => '',
        ])->assertStatus(422);

        // Cancellation succeeds with reason
        $res = $this->actingAs($this->customer)->postJson("/api/v1/customer/appointments/{$appointment->id}/cancel", [
            'reason' => 'Emergency family schedule change',
        ]);
        $res->assertOk();

        $fresh = $appointment->fresh();
        $this->assertEquals('cancelled', $fresh->status);
        $this->assertEquals('Emergency family schedule change', $fresh->cancellation_reason);

        // Admin notification verified
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'appointment_cancelled',
        ]);
        // Staff notification verified
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->staff->id,
            'type' => 'appointment_cancelled',
        ]);
    }

    // Maam Jessa #10: CSV and PDF export
    public function test_jessa_admin_can_export_reports_to_csv_and_pdf(): void
    {
        $this->createAppointment('completed', '10:00', '11:00');

        $this->actingAs($this->admin);

        // CSV export
        $csvRes = $this->get('/api/v1/admin/reports/overview?format=csv');
        $csvRes->assertOk();
        $this->assertStringContainsString('text/csv', $csvRes->headers->get('content-type'));

        // PDF export
        $pdfRes = $this->get('/api/v1/admin/reports/overview?format=pdf');
        $pdfRes->assertOk();
        $this->assertStringContainsString('application/pdf', $pdfRes->headers->get('content-type'));
    }

    private function createAppointment(string $status, string $start, string $end): Appointment
    {
        return Appointment::create([
            'appointment_number' => 'PAH-2026-' . rand(100000, 999999),
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $this->service1->id,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'start_time' => $start,
            'end_time' => $end,
            'service_name_snapshot' => $this->service1->name,
            'service_price_snapshot' => $this->service1->price,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $this->customer->name,
            'service_address' => '123 Main St',
            'status' => $status,
            'completed_at' => $status === 'completed' ? now() : null,
        ]);
    }
}
