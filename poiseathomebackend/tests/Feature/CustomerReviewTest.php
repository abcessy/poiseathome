<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\CustomerReview;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerReviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_reviews_are_public_and_customer_can_rate_without_staff(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);

        $this->actingAs($customer)->putJson('/api/v1/customer/review', [
            'rating' => 5,
            'comment' => 'Wonderful home service.',
        ])->assertOk();

        $this->getJson('/api/v1/reviews')->assertOk()
            ->assertJsonPath('data.summary.average', 5)
            ->assertJsonPath('data.reviews.0.customer_name', $customer->name);
    }

    public function test_customer_can_optionally_rate_staff_from_a_completed_appointment(): void
    {
        $customer = User::factory()->create(['role' => 'customer']);
        $staff = User::factory()->create(['role' => 'staff']);
        $otherStaff = User::factory()->create(['role' => 'staff']);
        $this->completedAppointment($customer, $staff);

        $this->actingAs($customer)->getJson('/api/v1/customer/review')->assertOk()
            ->assertJsonPath('data.staff.0.id', $staff->id);

        $this->actingAs($customer)->putJson('/api/v1/customer/review', [
            'rating' => 4,
            'comment' => 'Great stylist.',
            'staff_user_id' => $staff->id,
        ])->assertOk();

        $this->assertDatabaseHas('customer_reviews', ['customer_id' => $customer->id, 'staff_user_id' => $staff->id]);

        $this->actingAs($customer)->putJson('/api/v1/customer/review', [
            'rating' => 3,
            'staff_user_id' => $otherStaff->id,
        ])->assertUnprocessable();
    }

    public function test_non_customer_cannot_submit_a_review(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $this->actingAs($staff)->putJson('/api/v1/customer/review', ['rating' => 5])->assertForbidden();
    }

    private function completedAppointment(User $customer, User $staff): Appointment
    {
        $category = ServiceCategory::create(['name' => 'Hair', 'slug' => 'hair', 'is_active' => true]);
        $service = Service::create(['service_category_id' => $category->id, 'name' => 'Haircut', 'slug' => 'haircut', 'duration_minutes' => 60, 'price' => 500, 'is_active' => true]);

        return Appointment::create([
            'appointment_number' => 'PAH-2026-900001',
            'customer_id' => $customer->id,
            'staff_user_id' => $staff->id,
            'service_id' => $service->id,
            'appointment_date' => now()->subDay()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'service_name_snapshot' => 'Haircut',
            'service_price_snapshot' => 500,
            'service_duration_minutes_snapshot' => 60,
            'customer_name_snapshot' => $customer->name,
            'service_address' => '123 Main Street',
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }
}
