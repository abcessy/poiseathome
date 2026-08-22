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
}
