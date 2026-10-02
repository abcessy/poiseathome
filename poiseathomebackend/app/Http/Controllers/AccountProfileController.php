<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateAccountProfileRequest;
use App\Http\Requests\UpdateAccountPasswordRequest;
use App\Http\Requests\UploadAccountAvatarRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class AccountProfileController extends Controller
{
    public function update(UpdateAccountProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $user->update($request->validated());

        if ($user->role === 'staff') {
            if ($user->profile) {
                $user->profile->update([
                    'display_name' => $user->name,
                ]);
            } else {
                $user->profile()->create([
                    'display_name' => $user->name,
                    'is_available' => true,
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => $user->fresh()->load('profile'),
        ]);
    }

    public function updatePassword(UpdateAccountPasswordRequest $request): JsonResponse
    {
        $request->user()->update([
            'password' => Hash::make($request->validated('password')),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Password updated successfully.',
        ]);
    }

    public function uploadAvatar(UploadAccountAvatarRequest $request): JsonResponse
    {
        $user = $request->user();
        $previousPath = $user->avatar_path;
        $path = $request->file('avatar')->store("avatars/{$user->id}", 'images');

        $user->update(['avatar_path' => $path]);

        if ($user->role === 'staff' && $user->profile) {
            $user->profile->update(['profile_photo_path' => $path]);
        }

        if ($previousPath && $previousPath !== $path && Storage::disk('images')->exists($previousPath)) {
            Storage::disk('images')->delete($previousPath);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Profile photo updated successfully.',
            'data' => $user->fresh(),
        ]);
    }
}
