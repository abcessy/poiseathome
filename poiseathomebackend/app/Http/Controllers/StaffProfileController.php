<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class StaffProfileController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'status' => 'success',
            'data' => $user->load('profile')
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'display_name' => 'sometimes|string|max:255|nullable',
            'specialization' => 'sometimes|string|max:255|nullable',
            'bio' => 'sometimes|string|max:1000|nullable',
            'profile_photo' => 'sometimes|image|mimes:jpeg,png,webp|max:5120', // 5MB
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($user->profile->profile_photo_path) {
                Storage::disk('images')->delete($user->profile->profile_photo_path);
            }
            
            $path = $request->file('profile_photo')->store('staff', 'images');
            $validated['profile_photo_path'] = $path;
        }

        $user->profile->update($validated);

        return response()->json([
            'status' => 'success',
            'data' => $user->load('profile')
        ]);
    }

    public function updateAvailability(Request $request)
    {
        $validated = $request->validate([
            'is_available' => 'sometimes|required|boolean',
            'working_start_time' => 'sometimes|required|date_format:H:i',
            'working_end_time' => 'sometimes|required|date_format:H:i|after:working_start_time',
        ]);

        $request->user()->profile->update($validated);

        return response()->json([
            'status' => 'success',
            'data' => $request->user()->load('profile')
        ]);
    }
}
