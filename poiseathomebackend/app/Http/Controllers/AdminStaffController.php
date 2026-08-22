<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\StaffProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminStaffController extends Controller
{
    public function getUsers(Request $request)
    {
        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        return response()->json([
            'status' => 'success',
            'data' => $query->get(['id', 'name', 'email', 'contact_number', 'role', 'email_verified_at', 'is_active', 'created_at'])
        ]);
    }

    public function toggleActive(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot deactivate yourself'], 400);
        }

        $newActiveState = !$user->is_active;

        if (!$newActiveState && $user->role === 'staff') {
            $hasAppointments = \App\Models\Appointment::where('staff_user_id', $user->id)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->exists();
                
            if ($hasAppointments) {
                return response()->json(['message' => 'Cannot deactivate a staff member who has active appointments. Please reassign or cancel them first.'], 400);
            }
        }

        $user->update([
            'is_active' => $newActiveState
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $user
        ]);
    }

    public function index(Request $request)
    {
        $staff = User::where('role', 'staff')->with('profile')->get();
        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'contact_number' => 'required|string|max:50',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
            'password' => Hash::make($validated['password']),
            'role' => 'staff',
            'is_active' => true,
            'email_verified_at' => now(), // Auto-verify admin-created staff
        ]);

        StaffProfile::create([
            'user_id' => $user->id,
            'display_name' => $user->name,
            'is_available' => true,
        ]);

        return response()->json(['status' => 'success', 'data' => $user->load('profile')], 201);
    }

    public function show(User $staff)
    {
        if ($staff->role !== 'staff') {
            return response()->json(['message' => 'Not a staff member'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $staff->load(['profile', 'services'])]);
    }

    public function update(Request $request, User $staff)
    {
        if ($staff->role !== 'staff') {
            return response()->json(['message' => 'Not a staff member'], 404);
        }

        $validatedUser = $request->validate([
            'name' => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $validatedProfile = $request->validate([
            'specialization' => 'sometimes|string|max:255|nullable',
            'is_available' => 'sometimes|boolean',
        ]);

        $deactivating = isset($validatedUser['is_active']) && $validatedUser['is_active'] === false;

        if ($deactivating) {
            $hasAppointments = \App\Models\Appointment::where('staff_user_id', $staff->id)
                ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
                ->exists();
                
            if ($hasAppointments) {
                return response()->json(['message' => 'Cannot deactivate a staff member while they have active appointments. Please reassign or cancel them first.'], 400);
            }
        }

        $staff->update($validatedUser);
        
        if ($staff->profile) {
            $staff->profile->update($validatedProfile);
        }

        return response()->json(['status' => 'success', 'data' => $staff->load('profile')]);
    }
}
