<?php

namespace App\Services;

use App\Contracts\TransactionalEmailService;
use App\Models\User;
use App\Models\VerificationCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmailVerificationService
{
    public function __construct(private readonly TransactionalEmailService $email) {}

    public function issue(User $user): void
    {
        $code = $this->generateCode();
        $minutes = (int) config('poiseathome.authentication.code_expiration_minutes', 15);

        DB::transaction(function () use ($user, $code, $minutes): void {
            VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'email_verification')
                ->whereNull('consumed_at')
                ->update(['consumed_at' => now()]);

            VerificationCode::create([
                'user_id' => $user->id,
                'code_hash' => Hash::make($code),
                'purpose' => 'email_verification',
                'expires_at' => now()->addMinutes($minutes),
            ]);
        });

        $this->email->send(
            $user->email,
            'Verify your PoiseAtHome email',
            "PoiseAtHome\n\nWelcome to PoiseAtHome.\n\nUse this verification code to verify your email address:\n\n{$code}\n\nThis code expires in {$minutes} minutes.\n\nIf you did not create a PoiseAtHome account, you can ignore this email."
        );
    }

    public function verify(User $user, string $code): bool
    {
        return DB::transaction(function () use ($user, $code): bool {
            $activeCode = VerificationCode::where('user_id', $user->id)
                ->where('purpose', 'email_verification')
                ->whereNull('consumed_at')
                ->where('expires_at', '>', now())
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if (! $activeCode || ! Hash::check($code, $activeCode->code_hash)) {
                return false;
            }

            $activeCode->update(['consumed_at' => now()]);
            $user->update(['email_verified_at' => now()]);

            return true;
        });
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }
}
