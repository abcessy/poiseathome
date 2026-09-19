<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\ServiceCategory;
use App\Models\Service;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_can_view_active_categories()
    {
        ServiceCategory::create(['name' => 'Active Cat', 'slug' => 'active-cat', 'is_active' => true]);
        ServiceCategory::create(['name' => 'Inactive Cat', 'slug' => 'inactive-cat', 'is_active' => false]);

        $response = $this->getJson('/api/v1/service-categories');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Active Cat');
    }

    public function test_public_can_view_active_services_under_active_categories()
    {
        $cat = ServiceCategory::create(['name' => 'Hair', 'slug' => 'hair', 'is_active' => true]);
        Service::create([
            'service_category_id' => $cat->id,
            'name' => 'Haircut',
            'slug' => 'haircut',
            'duration_minutes' => 60,
            'price' => 500,
            'is_active' => true
        ]);
        Service::create([
            'service_category_id' => $cat->id,
            'name' => 'Hidden Haircut',
            'slug' => 'hidden',
            'duration_minutes' => 60,
            'price' => 500,
            'is_active' => false
        ]);

        $response = $this->getJson('/api/v1/services');
        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Haircut');
    }

    public function test_admin_can_manage_categories()
    {
        $admin = clone User::factory()->create(['role' => 'admin']);
        $response = $this->actingAs($admin)->postJson('/api/v1/admin/service-categories', [
            'name' => 'New Category'
        ]);
        $response->assertStatus(201);
        $this->assertDatabaseHas('service_categories', ['name' => 'New Category']);
    }

    public function test_customer_cannot_manage_categories()
    {
        $customer = clone User::factory()->create(['role' => 'customer']);
        $response = $this->actingAs($customer)->postJson('/api/v1/admin/service-categories', [
            'name' => 'New Category'
        ]);
        $response->assertStatus(403);
    }

    public function test_admin_can_delete_service_without_appointments()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $cat = ServiceCategory::create(['name' => 'Nails', 'slug' => 'nails', 'is_active' => true]);
        $svc = Service::create([
            'service_category_id' => $cat->id,
            'name' => 'Manicure',
            'slug' => 'manicure',
            'duration_minutes' => 45,
            'price' => 350,
            'is_home_service' => true,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/services/{$svc->id}");
        $response->assertOk();
        $this->assertDatabaseMissing('services', ['id' => $svc->id]);
    }

    public function test_admin_cannot_delete_service_with_appointments()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $customer = User::factory()->create(['role' => 'customer']);
        $staff = User::factory()->create(['role' => 'staff']);
        $cat = ServiceCategory::create(['name' => 'Nails', 'slug' => 'nails', 'is_active' => true]);
        $svc = Service::create([
            'service_category_id' => $cat->id,
            'name' => 'Pedicure',
            'slug' => 'pedicure',
            'duration_minutes' => 45,
            'price' => 350,
            'is_home_service' => true,
            'is_active' => true,
        ]);

        \App\Models\Appointment::create([
            'appointment_number' => 'TEST-SVC-DEL',
            'customer_id' => $customer->id,
            'staff_user_id' => $staff->id,
            'service_id' => $svc->id,
            'appointment_date' => now()->addDays(2)->format('Y-m-d'),
            'start_time' => '10:00:00',
            'end_time' => '10:45:00',
            'service_name_snapshot' => $svc->name,
            'service_price_snapshot' => $svc->price,
            'service_duration_minutes_snapshot' => 45,
            'customer_name_snapshot' => $customer->name,
            'service_address' => '123 Test St',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/admin/services/{$svc->id}");
        $response->assertStatus(422);
        $this->assertDatabaseHas('services', ['id' => $svc->id]);
    }
}
