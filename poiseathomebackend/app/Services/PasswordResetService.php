<?php

namespace App\Services;

use App\Contracts\TransactionalEmailService;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class PasswordResetService
{
    public function __construct(private readonly TransactionalEmailService $email) {}

    public function request(string $email): void
    {
        $user = $this->findUser($email);

        if (! $user) {
            return;
        }

        $code = $this->generateCode();
        $minutes = (int) config('poiseathome.authentication.code_expiration_minutes', 15);

        DB::transaction(function () use ($user, $code, $minutes): void {
            VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'password_reset')
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            VerificationCode::create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($code),
                'purpose' => 'password_reset',
                'expires_at' => now()->addMinutes($minutes),
            ]);
        });

        $this->email->send(
            $user->email,
            'Reset your PoiseAtHome password',
            "PoiseAtHome\n\nWe received a request to reset your password.\n\nUse this code to continue:\n\n{$code}\n\nThis code expires in {$minutes} minutes.\n\nIf you did not request a password reset, you can ignore this email."
        );
    }

    public function verifyCode(string $email, string $code): ?string
    {
        $user = $this->findUser($email);

        if (! $user) {
            Hash::check($code, '$2y$12$usesomesillystringfore7hnbRJHxXVLeakoG8K30oukPsA.ztMG');

            return null;
        }

        return DB::transaction(function () use ($user, $code): ?string {
            $record = VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'password_reset')
                ->whereNull('consumed_at')
                ->whereNull('verified_at')
                ->where('expires_at', '>', now())
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $record || ! Hash::check($code, $record->code_hash)) {
                return null;
            }

            $authorization = bin2hex(random_bytes(32));
            $record->update([
                'verified_at' => now(),
                'authorization_hash' => hash('sha256', $authorization),
                'authorization_expires_at' => now()->addMinutes(
                    (int) config('poiseathome.authentication.reset_authorization_minutes', 10)
                ),
            ]);

            return $authorization;
        });
    }

    public function reset(string $email, string $authorization, string $password): bool
    {
        $user = $this->findUser($email);

        if (! $user) {
            return false;
        }

        return DB::transaction(function () use ($user, $authorization, $password): bool {
            $record = VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'password_reset')
                ->whereNull('consumed_at')
                ->whereNotNull('verified_at')
                ->where('authorization_expires_at', '>', now())
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $record || ! hash_equals((string) $record->authorization_hash, hash('sha256', $authorization))) {
                return false;
            }

            $user->update(['password' => Hash::make($password)]);

            VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'password_reset')
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now(), 'authorization_hash' => null]);

            if (Schema::hasTable('personal_access_tokens')) {
                $user->tokens()->delete();
            }
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }

            return true;
        });
    }

    private function findUser(string $email): ?User
    {
        return User::whereRaw('LOWER(email) = ?', [mb_strtolower(trim($email))])->first();
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
