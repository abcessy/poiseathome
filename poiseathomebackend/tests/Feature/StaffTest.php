<?php

namespace Tests\Feature;

use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_name_change_syncs_to_staff_profile_and_admin_staff_endpoint(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $staff = User::factory()->create([
            'name' => 'Original Staff Name',
            'role' => 'staff',
            'is_active' => true,
        ]);

        StaffProfile::create([
            'user_id' => $staff->id,
            'display_name' => 'Original Staff Name',
            'is_available' => true,
        ]);

        // Staff updates their name via account profile
        $updateResponse = $this->actingAs($staff)->patchJson('/api/v1/account/profile', [
            'name' => 'Updated Staff Name',
            'contact_number' => '09123456789',
        ]);

        $updateResponse->assertStatus(200);

        // Verify both user and staff profile display_name updated
        $this->assertEquals('Updated Staff Name', $staff->fresh()->name);
        $this->assertEquals('Updated Staff Name', $staff->fresh()->profile->display_name);

        // Verify admin staff list returns updated name and display_name
        $adminListResponse = $this->actingAs($admin)->getJson('/api/v1/admin/staff');
        $adminListResponse->assertStatus(200);
        $staffData = collect($adminListResponse->json('data'))->firstWhere('id', $staff->id);

        $this->assertNotNull($staffData);
        $this->assertEquals('Updated Staff Name', $staffData['name']);
        $this->assertEquals('Updated Staff Name', $staffData['profile']['display_name']);
    }

    public function test_admin_updating_staff_name_syncs_display_name(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'is_active' => true]);
        $staff = User::factory()->create([
            'name' => 'Old Staff Name',
            'role' => 'staff',
            'is_active' => true,
        ]);

        StaffProfile::create([
            'user_id' => $staff->id,
            'display_name' => 'Old Staff Name',
            'is_available' => true,
        ]);

        $response = $this->actingAs($admin)->putJson("/api/v1/admin/staff/{$staff->id}", [
            'name' => 'Admin Updated Name',
        ]);

        $response->assertStatus(200);
        $this->assertEquals('Admin Updated Name', $staff->fresh()->name);
        $this->assertEquals('Admin Updated Name', $staff->fresh()->profile->display_name);
    }
}
