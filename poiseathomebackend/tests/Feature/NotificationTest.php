<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Notification;
use App\Models\ProductCategory;
use App\Models\Product;
use App\Models\ServiceCategory;
use App\Models\Service;
use App\Models\StaffProfile;
use App\Models\Appointment;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->staff = User::factory()->create(['role' => 'staff']);
        StaffProfile::create(['user_id' => $this->staff->id, 'display_name' => 'Staff', 'is_available' => true]);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->customer2 = User::factory()->create(['role' => 'customer']);
    }

    public function test_ownership_and_unread()
    {
        Notification::create(['user_id' => $this->customer->id, 'type' => 'test', 'title' => 'T1', 'message' => 'M1']);
        Notification::create(['user_id' => $this->customer2->id, 'type' => 'test', 'title' => 'T2', 'message' => 'M2']);

        $res = $this->actingAs($this->customer)->getJson('/api/v1/notifications');
        $res->assertStatus(200);
        $this->assertCount(1, $res->json('data'));
        $this->assertEquals('T1', $res->json('data.0.title'));

        $res = $this->actingAs($this->customer)->getJson('/api/v1/notifications/unread-count');
        $this->assertEquals(1, $res->json('data.count'));

        $notif = Notification::first();
        $res = $this->actingAs($this->customer2)->patchJson("/api/v1/notifications/{$notif->id}/read");
        $res->assertStatus(403);

        $res = $this->actingAs($this->customer)->patchJson("/api/v1/notifications/{$notif->id}/read");
        $res->assertStatus(200);

        $res = $this->actingAs($this->customer)->getJson('/api/v1/notifications/unread-count');
        $this->assertEquals(0, $res->json('data.count'));
    }

    public function test_booking_creates_notifications()
    {
        $sc = ServiceCategory::create(['name' => 'C', 'slug' => 'c', 'is_active' => true]);
        $s = Service::create(['service_category_id' => $sc->id, 'name' => 'S', 'slug' => 's', 'price' => 100, 'duration_minutes' => 60, 'is_active' => true, 'is_home_service' => true]);
        $this->staff->services()->attach($s->id);

        $this->actingAs($this->customer);
        $res = $this->postJson('/api/v1/appointments', [
            'service_id' => $s->id,
            'staff_id' => $this->staff->id,
            'date' => now()->addDays(2)->format('Y-m-d'),
            'start_time' => '10:00',
            'service_address' => '123 Test St',
        ]);
        
        $res->assertStatus(201);

        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->customer->id,
            'type' => 'appointment_booked'
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->admin->id,
            'type' => 'appointment_booked'
        ]);
        $this->assertDatabaseHas('notifications', [
            'user_id' => $this->staff->id,
            'type' => 'appointment_assigned'
        ]);
    }

    public function test_status_change_creates_notifications()
    {
        $sc = ServiceCategory::create(['name' => 'C', 'slug' => 'c', 'is_active' => true]);
        $s = Service::create(['service_category_id' => $sc->id, 'name' => 'S', 'slug' => 's', 'price' => 100, 'duration_minutes' => 60, 'is_active' => true]);
        
        $app = Appointment::create([
            'appointment_number' => 'APP-1',
            'customer_id' => $this->customer->id,
            'staff_user_id' => $this->staff->id,
            'service_id' => $s->id,
            'appointment_date' => '2026-09-01',
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'status' => 'pending',
            'required_downpayment_amount' => 0,
            'service_name_snapshot' => 'S',
            'service_price_snapshot' => 100,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => 'Cust',
            'service_address' => 'Addr',
        ]);

        $this->actingAs($this->admin);
        
        $this->patchJson("/api/v1/admin/appointments/{$app->id}/status", ['status' => 'confirmed'])->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->customer->id, 'type' => 'appointment_confirmed']);

        $this->patchJson("/api/v1/admin/appointments/{$app->id}/status", ['status' => 'in_progress'])->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->customer->id, 'type' => 'appointment_in_progress']);
        
        $this->patchJson("/api/v1/admin/appointments/{$app->id}/status", ['status' => 'completed'])->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->customer->id, 'type' => 'appointment_completed']);
    }

    public function test_low_stock_deduplication()
    {
        $cat = ProductCategory::create(['name' => 'T', 'slug' => 't', 'is_active' => true]);
        $prod = Product::create(['product_category_id' => $cat->id, 'sku' => 'P1', 'name' => 'P', 'unit' => 'ml', 'low_stock_threshold' => 50, 'is_active' => true]);
        
        $ns = app(\App\Services\InventoryService::class);
        $ns->initializeInventory($prod, 100, $this->admin->id);

        $this->actingAs($this->admin);

        // 100 -> 40 (Cross threshold, should trigger)
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-out", ['quantity' => 60, 'notes' => 'Test'])->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->admin->id, 'type' => 'low_stock']);
        $this->assertEquals(1, Notification::where('type', 'low_stock')->count());

        // 40 -> 30 (Still low, no new trigger)
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-out", ['quantity' => 10, 'notes' => 'Test'])->assertStatus(200);
        $this->assertEquals(1, Notification::where('type', 'low_stock')->count());

        // 30 -> 80 (Recover)
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-in", ['quantity' => 50, 'notes' => 'Test'])->assertStatus(200);
        $this->assertEquals(1, Notification::where('type', 'low_stock')->count());

        // 80 -> 20 (Cross threshold again, NEW trigger)
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-out", ['quantity' => 60, 'notes' => 'Test'])->assertStatus(200);
        $this->assertEquals(2, Notification::where('type', 'low_stock')->count());

        // 20 -> 0 (Cross to Out of Stock)
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-out", ['quantity' => 20, 'notes' => 'Test'])->assertStatus(200);
        $this->assertDatabaseHas('notifications', ['user_id' => $this->admin->id, 'type' => 'out_of_stock']);
        $this->assertEquals(1, Notification::where('type', 'out_of_stock')->count());

        // Attempt out of stock when already 0 -> rejected by InventoryService anyway
        $this->postJson("/api/v1/admin/inventory/{$prod->id}/stock-out", ['quantity' => 10, 'notes' => 'Test'])->assertStatus(422);
    }
}
