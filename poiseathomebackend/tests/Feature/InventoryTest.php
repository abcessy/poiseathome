<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\ProductCategory;
use App\Models\Product;
use App\Models\Appointment;
use App\Models\ServiceCategory;
use App\Models\Service;
use App\Models\StaffProfile;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->staff = User::factory()->create(['role' => 'staff']);
        StaffProfile::create(['user_id' => $this->staff->id, 'display_name' => 'Staff', 'bio' => '', 'is_available' => true]);
        $this->customer = User::factory()->create(['role' => 'customer']);

        $this->cat = ProductCategory::create(['name' => 'Test', 'slug' => 'test-cat', 'is_active' => true]);
    }

    public function test_admin_can_stock_in_and_out()
    {
        $this->actingAs($this->admin);

        // Create product with initial stock 10
        $res = $this->postJson('/api/v1/admin/products', [
            'product_category_id' => $this->cat->id,
            'sku' => 'TEST-001',
            'name' => 'Test Product',
            'unit' => 'piece',
            'low_stock_threshold' => 5,
            'is_active' => true,
            'initial_quantity' => 10,
        ]);
        $res->assertStatus(201);
        $product = Product::first();

        // Stock in 5
        $res = $this->postJson("/api/v1/admin/inventory/{$product->id}/stock-in", [
            'quantity' => 5,
        ]);
        $res->assertStatus(200);
        $this->assertEquals(15, $product->fresh()->inventory->available_quantity);

        // Stock out 3
        $res = $this->postJson("/api/v1/admin/inventory/{$product->id}/stock-out", [
            'quantity' => 3,
            'notes' => 'Damaged'
        ]);
        $res->assertStatus(200);
        $this->assertEquals(12, $product->fresh()->inventory->available_quantity);
    }

    public function test_insufficient_stock_is_rejected()
    {
        $this->actingAs($this->admin);

        $product = Product::create([
            'product_category_id' => $this->cat->id,
            'sku' => 'TEST-002',
            'name' => 'Test Product 2',
            'unit' => 'piece',
        ]);
        $product->inventory()->create(['available_quantity' => 10]);

        // Attempt out 15
        $res = $this->postJson("/api/v1/admin/inventory/{$product->id}/stock-out", [
            'quantity' => 15,
            'notes' => 'Testing'
        ]);
        
        $res->assertStatus(422);
        $res->assertJsonPath('code', 'INSUFFICIENT_STOCK');
        $this->assertEquals(10, $product->fresh()->inventory->available_quantity);
    }

    public function test_staff_can_record_usage_and_reverse()
    {
        $product = Product::create([
            'product_category_id' => $this->cat->id,
            'sku' => 'TEST-003',
            'name' => 'Usage Test',
            'unit' => 'piece',
            'is_active' => true,
        ]);
        $product->inventory()->create(['available_quantity' => 20]);

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
            'status' => 'in_progress',
            'required_downpayment_amount' => 30,
            'service_name_snapshot' => 'S',
            'service_price_snapshot' => 100,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => 'Cust',
            'service_address' => 'Addr',
        ]);

        $this->actingAs($this->staff);

        // Record usage
        $res = $this->postJson("/api/v1/staff/appointments/{$app->id}/product-usages", [
            'product_id' => $product->id,
            'quantity' => 2,
        ]);
        $res->assertStatus(200);

        $this->assertEquals(18, $product->fresh()->inventory->available_quantity);
        $usage = $app->productUsages()->first();
        $this->assertNotNull($usage);
        $this->assertEquals(2, $usage->quantity);

        // Reverse usage
        $res = $this->postJson("/api/v1/staff/appointments/{$app->id}/product-usages/{$usage->id}/reverse");
        $res->assertStatus(200);

        $this->assertEquals(20, $product->fresh()->inventory->available_quantity);
        $this->assertNotNull($usage->fresh()->reversed_at);

        $this->postJson("/api/v1/staff/appointments/{$app->id}/product-usages/{$usage->id}/reverse")
            ->assertStatus(400);
        $this->assertEquals(20, $product->fresh()->inventory->available_quantity);
    }
}
