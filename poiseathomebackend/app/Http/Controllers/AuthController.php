<?php

namespace App\Http\Controllers;

use App\Exceptions\EmailDeliveryException;
use App\Models\User;
use App\Services\EmailVerificationService;
use App\Services\PasswordResetService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    private const PASSWORD_RESET_REQUEST_MESSAGE = 'If an account exists for that email, a password reset code has been sent.';

    public function __construct(
        private readonly EmailVerificationService $emailVerification,
        private readonly PasswordResetService $passwordReset,
    ) {}

    public function register(Request $request)
    {
        if ($request->has('contact_number') && $request->contact_number !== null) {
            $request->merge(['contact_number' => preg_replace('/[\s\-]/', '', (string) $request->contact_number)]);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'contact_number' => ['required', 'string', 'regex:/^(09\d{9}|\+639\d{9})$/'],
            'password' => 'required|string|min:8|confirmed',
            'terms_accepted' => 'required|accepted',
        ], [
            'contact_number.regex' => 'The contact number must be a valid Philippine mobile number (e.g. 09123456789 or +639123456789).',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'password' => Hash::make($validated['password']),
            'role' => 'customer',
            'is_active' => true,
        ]);

        try {
            $this->emailVerification->issue($user);
            $message = 'Registration successful. Please verify your email.';
        } catch (EmailDeliveryException $exception) {
            Log::warning('Registration verification email could not be delivered.', ['user_id' => $user->id]);
            $message = 'Registration successful, but the verification email could not be delivered. Please request a new code.';
        }

        return response()->json([
            'status' => 'success',
            'message' => $message,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Account is inactive',
            ], 403);
        }

        if (is_null($user->email_verified_at)) {
            return response()->json([
                'message' => 'EMAIL_NOT_VERIFIED',
            ], 403);
        }

        Auth::login($user);

        return response()->json([
            'status' => 'success',
            'data' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['status' => 'success']);
    }

    public function me(Request $request)
    {
        return response()->json([
            'data' => $request->user(),
        ]);
    }

    public function verifyEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email already verified'], 400);
        }

        if (! $this->emailVerification->verify($user, $request->code)) {
            return response()->json(['message' => 'Invalid or expired verification code'], 400);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Email verified successfully.',
        ]);
    }

    public function resendVerification(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || $user->email_verified_at) {
            return response()->json(['message' => 'User not found or already verified'], 400);
        }

        try {
            $this->emailVerification->issue($user);
        } catch (EmailDeliveryException $exception) {
            Log::warning('Verification email could not be delivered.', ['user_id' => $user->id]);

            return response()->json([
                'message' => 'The verification email could not be sent. Please try again later.',
            ], 503);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Verification code sent.',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $validated = $request->validate(['email' => 'required|email|max:255']);

        try {
            $this->passwordReset->request($validated['email']);
        } catch (EmailDeliveryException $exception) {
            Log::warning('Password reset email could not be delivered.');
        }

        return response()->json([
            'status' => 'success',
            'message' => self::PASSWORD_RESET_REQUEST_MESSAGE,
        ], 202);
    }

    public function verifyPasswordResetCode(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'code' => ['required', 'string', 'regex:/^\d{6}$/'],
        ]);

        $authorization = $this->passwordReset->verifyCode($validated['email'], $validated['code']);

        if (! $authorization) {
            return response()->json(['message' => 'Invalid or expired reset code.'], 422);
        }

        return response()->json([
            'status' => 'success',
            'data' => ['reset_authorization' => $authorization],
        ]);
    }

    public function resetPassword(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'reset_authorization' => 'required|string|size:64',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $reset = $this->passwordReset->reset(
            $validated['email'],
            $validated['reset_authorization'],
            $validated['password'],
        );

        if (! $reset) {
            return response()->json(['message' => 'Your password reset authorization is invalid or expired.'], 422);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Your password has been reset.',
        ]);
    }
}
