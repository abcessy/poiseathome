<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AccountProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_authenticated_role_can_update_personal_profile(): void
    {
        foreach (['admin', 'staff', 'customer'] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->actingAs($user)->patchJson('/api/v1/account/profile', [
                'name' => ucfirst($role).' Updated',
                'contact_number' => '09171234567',
            ])->assertOk()->assertJsonPath('data.name', ucfirst($role).' Updated');
        }
    }

    public function test_guest_cannot_update_a_profile(): void
    {
        $this->patchJson('/api/v1/account/profile', [
            'name' => 'Guest',
            'contact_number' => '09171234567',
        ])->assertUnauthorized();
    }

    public function test_user_can_change_password_with_current_password(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user)->patchJson('/api/v1/account/password', [
            'current_password' => 'old-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
    }

    public function test_current_password_must_be_correct(): void
    {
        $user = User::factory()->create(['password' => 'old-password']);

        $this->actingAs($user)->patchJson('/api/v1/account/password', [
            'current_password' => 'incorrect-password',
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('current_password');

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_user_can_upload_an_avatar_to_the_images_disk(): void
    {
        Storage::fake('images');
        $user = User::factory()->create();

        $this->actingAs($user)->postJson('/api/v1/account/avatar', [
            'avatar' => UploadedFile::fake()->createWithContent(
                'avatar.png',
                base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')
            ),
        ])->assertOk();

        $path = $user->fresh()->avatar_path;
        $this->assertStringStartsWith("avatars/{$user->id}/", $path);
        Storage::disk('images')->assertExists($path);
    }
}
