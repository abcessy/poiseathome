<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;
use App\Models\User;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_register()
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'contact_number' => '09123456789',
            'address' => '123 Street',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms_accepted' => true,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'john@example.com', 'role' => 'customer']);
        $this->assertDatabaseHas('verification_codes', ['purpose' => 'email_verification']);
    }

    public function test_customer_must_accept_terms_to_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'contact_number' => '09123456789',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms_accepted' => false,
        ]);

        $response->assertUnprocessable()->assertJsonValidationErrors('terms_accepted');
        $this->assertDatabaseMissing('users', ['email' => 'john@example.com']);
    }

    public function test_inactive_login_rejected()
    {
        $user = clone User::factory()->create(['is_active' => false]);
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);
        $response->assertStatus(403);
    }
}
