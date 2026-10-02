<?php

namespace App\Http\Controllers;

use App\Models\StaffDayOff;
use App\Models\User;
use Illuminate\Http\Request;

class StaffDayOffController extends Controller
{
    // STAFF ENDPOINTS
    public function index(Request $request)
    {
        $daysOff = $request->user()->daysOff()->orderBy('date')->get();
        return response()->json(['status' => 'success', 'data' => $daysOff]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'reason' => 'sometimes|string|max:255|nullable',
        ]);

        // check if already exists
        $exists = $request->user()->daysOff()->where('date', $validated['date'])->exists();
        if ($exists) {
            return response()->json(['message' => 'Day off already exists for this date'], 400);
        }

        // check if staff has appointments on this date
        $hasAppointments = \App\Models\Appointment::where('staff_user_id', $request->user()->id)
            ->whereDate('appointment_date', $validated['date'])
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->exists();
            
        if ($hasAppointments) {
            return response()->json(['message' => 'Cannot take a day off on a date with existing appointments.'], 400);
        }

        $dayOff = $request->user()->daysOff()->create([
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['status' => 'success', 'data' => $dayOff], 201);
    }

    public function destroy(Request $request, StaffDayOff $dayOff)
    {
        if ($dayOff->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $dayOff->delete();
        return response()->json(['status' => 'success']);
    }

    // ADMIN ENDPOINTS
    public function adminIndex(Request $request, User $staff)
    {
        if ($staff->role !== 'staff') {
            return response()->json(['message' => 'Not a staff member'], 404);
        }

        return response()->json(['status' => 'success', 'data' => $staff->daysOff()->orderBy('date')->get()]);
    }

    public function adminStore(Request $request, User $staff)
    {
        if ($staff->role !== 'staff') {
            return response()->json(['message' => 'Not a staff member'], 404);
        }

        $validated = $request->validate([
            'date' => 'required|date',
            'reason' => 'sometimes|string|max:255|nullable',
        ]);

        $exists = $staff->daysOff()->where('date', $validated['date'])->exists();
        if ($exists) {
            return response()->json(['message' => 'Day off already exists for this date'], 400);
        }

        // check if staff has appointments on this date
        $hasAppointments = \App\Models\Appointment::where('staff_user_id', $staff->id)
            ->whereDate('appointment_date', $validated['date'])
            ->whereIn('status', ['pending', 'confirmed', 'in_progress'])
            ->exists();
            
        if ($hasAppointments) {
            return response()->json(['message' => 'Cannot assign a day off to a staff member on a date with existing appointments. Please reassign or cancel them first.'], 400);
        }

        $dayOff = $staff->daysOff()->create([
            'date' => $validated['date'],
            'reason' => $validated['reason'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return response()->json(['status' => 'success', 'data' => $dayOff], 201);
    }

    public function adminDestroy(Request $request, User $staff, StaffDayOff $dayOff)
    {
        if ($dayOff->staff_user_id !== $staff->id) {
            return response()->json(['message' => 'Mismatch staff'], 400);
        }

        $dayOff->delete();
        return response()->json(['status' => 'success']);
    }
}
