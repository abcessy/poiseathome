<?php

namespace App\Http\Controllers;

use App\Models\Service;
use App\Models\User;
use Illuminate\Http\Request;

class StaffServiceController extends Controller
{
    public function getStaffForService(Service $service)
    {
        $staff = $service->qualifiedStaff()->with('profile')->get();
        return response()->json(['status' => 'success', 'data' => $staff]);
    }

    public function updateStaffForService(Request $request, Service $service)
    {
        $validated = $request->validate([
            'staff_ids' => 'required|array',
            'staff_ids.*' => 'exists:users,id'
        ]);

        // Ensure all provided IDs actually belong to 'staff' role
        $validStaffIds = User::whereIn('id', $validated['staff_ids'])
            ->where('role', 'staff')
            ->pluck('id')
            ->toArray();

        $service->qualifiedStaff()->sync($validStaffIds);

        return response()->json([
            'status' => 'success',
            'message' => 'Qualified staff updated.',
            'data' => $service->qualifiedStaff()->with('profile')->get()
        ]);
    }

    public function myServices(Request $request)
    {
        $services = $request->user()->services()->with('category')->get();
        return response()->json([
            'status' => 'success',
            'data' => $services
        ]);
    }
}
