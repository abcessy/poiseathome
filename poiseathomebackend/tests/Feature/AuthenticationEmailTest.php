<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AuthenticationEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.brevo.key' => null,
            'services.brevo.from_email' => 'noreply@example.com',
            'services.brevo.from_name' => 'PoiseAtHome',
            'services.resend.key' => null,
            'services.resend.from_email' => 'noreply@example.com',
            'services.resend.from_name' => 'PoiseAtHome',
        ]);
    }

    public function test_registration_stores_a_hashed_verification_code_and_sends_resend_email(): void
    {
        $this->fakeResend();

        $this->register('verification@example.com')->assertCreated();

        $code = $this->latestCodeFromEmail();
        $record = VerificationCode::where('purpose', 'email_verification')->firstOrFail();

        $this->assertNotSame($code, $record->code_hash);
        $this->assertTrue(Hash::check($code, $record->code_hash));
        Http::assertSent(fn ($request) => $request->url() === 'https://api.brevo.com/v3/smtp/email'
            && $request->hasHeader('api-key', 'test-brevo-key')
            && $request['sender'] === ['name' => 'PoiseAtHome', 'email' => 'noreply@example.com']
            && $request['subject'] === 'Verify your PoiseAtHome email'
            && $request['to'] === [['email' => 'verification@example.com']]
        );
    }

    public function test_existing_email_verification_still_succeeds_and_is_single_use(): void
    {
        $this->fakeResend();
        $this->register('verify@example.com');
        $code = $this->latestCodeFromEmail();

        $this->postJson('/api/v1/auth/verify-email', ['email' => 'verify@example.com', 'code' => $code])
            ->assertOk();

        $this->assertNotNull(User::where('email', 'verify@example.com')->firstOrFail()->email_verified_at);
        $this->assertNotNull(VerificationCode::firstOrFail()->consumed_at);
        $this->postJson('/api/v1/auth/verify-email', ['email' => 'verify@example.com', 'code' => $code])
            ->assertStatus(400);
    }

    public function test_resending_verification_invalidates_the_previous_code_and_sends_a_new_one(): void
    {
        $this->fakeResend();
        $this->register('resend@example.com');
        $oldCode = $this->latestCodeFromEmail();

        $this->postJson('/api/v1/auth/resend-verification', ['email' => 'resend@example.com'])->assertOk();
        $newCode = $this->latestCodeFromEmail();

        $this->assertNotSame($oldCode, $newCode);
        $this->postJson('/api/v1/auth/verify-email', ['email' => 'resend@example.com', 'code' => $oldCode])
            ->assertStatus(400);
        $this->postJson('/api/v1/auth/verify-email', ['email' => 'resend@example.com', 'code' => $newCode])
            ->assertOk();
    }

    public function test_missing_resend_configuration_uses_local_verification_log_fallback(): void
    {
        Http::fake();
        Log::spy();

        $this->register('fallback@example.com')->assertCreated();

        Http::assertNothingSent();
        Log::shouldHaveReceived('info')->withArgs(fn ($message, $context) => str_contains($message, 'Use this verification code')
            && $context['delivery'] === 'local-log'
        );
    }

    public function test_resend_provider_failure_is_handled_without_exposing_provider_details(): void
    {
        config(['services.brevo.key' => 'test-brevo-key']);
        Http::fake(['api.brevo.com/*' => Http::response(['message' => 'provider detail'], 500)]);

        $response = $this->register('failure@example.com');

        $response->assertCreated()
            ->assertJsonMissing(['message' => 'provider detail'])
            ->assertJsonPath('status', 'success');
        $this->assertDatabaseHas('users', ['email' => 'failure@example.com']);
        $this->assertDatabaseHas('verification_codes', ['purpose' => 'email_verification']);
    }

    public function test_missing_resend_configuration_in_production_never_logs_the_plaintext_code(): void
    {
        $this->app['env'] = 'production';
        Http::fake();
        Log::spy();

        $this->register('production@example.com')->assertCreated();

        Http::assertNothingSent();
        Log::shouldNotHaveReceived('info');
        Log::shouldHaveReceived('error')->with('Transactional email delivery is unavailable because Brevo is not configured.');
    }

    public function test_forgot_password_is_indistinguishable_for_existing_and_unknown_emails(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'known@example.com']);

        $known = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'known@example.com']);
        $unknown = $this->postJson('/api/v1/auth/forgot-password', ['email' => 'unknown@example.com']);

        $known->assertStatus(202);
        $unknown->assertStatus(202);
        $this->assertSame($known->json('message'), $unknown->json('message'));
    }

    public function test_forgot_password_stores_only_a_hash_and_sends_resend_email(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'reset@example.com']);

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'reset@example.com'])->assertStatus(202);

        $code = $this->latestCodeFromEmail();
        $record = VerificationCode::where('purpose', 'password_reset')->firstOrFail();
        $this->assertNotSame($code, $record->code_hash);
        $this->assertTrue(Hash::check($code, $record->code_hash));
        Http::assertSent(fn ($request) => $request['subject'] === 'Reset your PoiseAtHome password'
            && $request['to'] === [['email' => 'reset@example.com']]
        );
    }

    public function test_missing_resend_configuration_uses_local_password_reset_log_fallback(): void
    {
        User::factory()->create(['email' => 'local-reset@example.com']);
        Http::fake();
        Log::spy();

        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'local-reset@example.com'])
            ->assertStatus(202);

        Http::assertNothingSent();
        Log::shouldHaveReceived('info')->withArgs(fn ($message, $context) => str_contains($message, 'Use this code to continue')
            && $context['delivery'] === 'local-log'
        );
    }

    public function test_expired_and_incorrect_reset_codes_are_rejected(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'expired@example.com']);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'expired@example.com']);
        $code = $this->latestCodeFromEmail();

        $this->postJson('/api/v1/auth/forgot-password/verify', ['email' => 'expired@example.com', 'code' => '000000'])
            ->assertStatus(422);

        VerificationCode::where('purpose', 'password_reset')->update(['expires_at' => now()->subMinute()]);
        $this->postJson('/api/v1/auth/forgot-password/verify', ['email' => 'expired@example.com', 'code' => $code])
            ->assertStatus(422);
    }

    public function test_correct_code_authorizes_reset_and_new_password_is_hashed(): void
    {
        $this->fakeResend();
        $user = User::factory()->create([
            'email' => 'success@example.com',
            'email_verified_at' => now(),
            'password' => Hash::make('old-password'),
        ]);

        $authorization = $this->requestAndVerifyReset('success@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'success@example.com',
            'reset_authorization' => $authorization,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password', $user->fresh()->password));
        $this->assertFalse(Hash::check('old-password', $user->fresh()->password));
        $this->postJson('/api/v1/auth/login', ['email' => 'success@example.com', 'password' => 'old-password'])
            ->assertUnauthorized();
        $this->postJson('/api/v1/auth/login', ['email' => 'success@example.com', 'password' => 'new-password'])
            ->assertOk();
    }

    public function test_password_confirmation_must_match(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'confirmation@example.com']);
        $authorization = $this->requestAndVerifyReset('confirmation@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'confirmation@example.com',
            'reset_authorization' => $authorization,
            'password' => 'new-password',
            'password_confirmation' => 'different-password',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_consumed_reset_authorization_cannot_be_reused(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'single-use@example.com']);
        $authorization = $this->requestAndVerifyReset('single-use@example.com');
        $payload = [
            'email' => 'single-use@example.com',
            'reset_authorization' => $authorization,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ];

        $this->postJson('/api/v1/auth/reset-password', $payload)->assertOk();
        $this->postJson('/api/v1/auth/reset-password', $payload)->assertStatus(422);
    }

    public function test_expired_reset_authorization_cannot_change_the_password(): void
    {
        $this->fakeResend();
        $user = User::factory()->create(['email' => 'expired-authorization@example.com', 'password' => Hash::make('old-password')]);
        $authorization = $this->requestAndVerifyReset('expired-authorization@example.com');
        VerificationCode::where('purpose', 'password_reset')->update(['authorization_expires_at' => now()->subMinute()]);

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'expired-authorization@example.com',
            'reset_authorization' => $authorization,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('old-password', $user->fresh()->password));
    }

    public function test_requesting_another_reset_code_invalidates_the_previous_one(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'new-code@example.com']);
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'new-code@example.com']);
        $oldCode = $this->latestCodeFromEmail();
        $this->postJson('/api/v1/auth/forgot-password', ['email' => 'new-code@example.com']);
        $newCode = $this->latestCodeFromEmail();

        $this->postJson('/api/v1/auth/forgot-password/verify', ['email' => 'new-code@example.com', 'code' => $oldCode])
            ->assertStatus(422);
        $this->postJson('/api/v1/auth/forgot-password/verify', ['email' => 'new-code@example.com', 'code' => $newCode])
            ->assertOk();
    }

    public function test_inactive_account_is_not_reactivated_by_password_reset(): void
    {
        $this->fakeResend();
        $user = User::factory()->create(['email' => 'inactive@example.com', 'is_active' => false]);
        $authorization = $this->requestAndVerifyReset('inactive@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'inactive@example.com',
            'reset_authorization' => $authorization,
            'password' => 'new-password',
            'password_confirmation' => 'new-password',
        ])->assertOk();

        $this->assertFalse($user->fresh()->is_active);
        $this->postJson('/api/v1/auth/login', ['email' => 'inactive@example.com', 'password' => 'new-password'])
            ->assertForbidden();
    }

    public function test_reset_authorization_cannot_be_applied_to_another_email(): void
    {
        $this->fakeResend();
        User::factory()->create(['email' => 'owner@example.com']);
        $other = User::factory()->create(['email' => 'other@example.com', 'password' => Hash::make('unchanged-password')]);
        $authorization = $this->requestAndVerifyReset('owner@example.com');

        $this->postJson('/api/v1/auth/reset-password', [
            'email' => 'other@example.com',
            'reset_authorization' => $authorization,
            'password' => 'attacker-password',
            'password_confirmation' => 'attacker-password',
        ])->assertStatus(422);

        $this->assertTrue(Hash::check('unchanged-password', $other->fresh()->password));
    }

    public function test_reset_code_verification_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $this->postJson('/api/v1/auth/forgot-password/verify', [
                'email' => 'brute-force@example.com',
                'code' => '000000',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/auth/forgot-password/verify', [
            'email' => 'brute-force@example.com',
            'code' => '000000',
        ])->assertTooManyRequests();
    }

    private function fakeResend(): void
    {
        config([
            'services.brevo.key' => 'test-brevo-key',
            'services.resend.key' => 'test-brevo-key',
        ]);
        Http::fake([
            'api.brevo.com/*' => Http::response(['messageId' => 'email_test_123'], 201),
            'api.resend.com/*' => Http::response(['id' => 'email_test_123'], 200),
        ]);
    }

    private function register(string $email)
    {
        return $this->postJson('/api/v1/auth/register', [
            'name' => 'Test Customer',
            'email' => $email,
            'contact_number' => '09123456789',
            'address' => 'Test Address',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms_accepted' => true,
        ]);
    }

    private function latestCodeFromEmail(): string
    {
        $request = Http::recorded()->last()[0];
        $body = $request['htmlContent'] ?? $request['text'] ?? '';
        preg_match('/\b(\d{6})\b/', $body, $matches);

        return $matches[1];
    }

    private function requestAndVerifyReset(string $email): string
    {
        $this->postJson('/api/v1/auth/forgot-password', ['email' => $email])->assertStatus(202);
        $code = $this->latestCodeFromEmail();

        return $this->postJson('/api/v1/auth/forgot-password/verify', ['email' => $email, 'code' => $code])
            ->assertOk()
            ->json('data.reset_authorization');
    }
}
