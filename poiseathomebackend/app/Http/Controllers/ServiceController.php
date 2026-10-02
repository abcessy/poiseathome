<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class ServiceController extends Controller
{
    public function publicIndex(Request $request)
    {
        $query = Service::where('is_active', true)->whereHas('category', function($q) {
            $q->where('is_active', true);
        })->with('category:id,name,slug');

        if ($request->has('category')) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('slug', $request->category);
            });
        }

        if ($request->has('search')) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        if ($request->has('home_service')) {
            $query->where('is_home_service', filter_var($request->home_service, FILTER_VALIDATE_BOOLEAN));
        }

        $services = $query->orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['status' => 'success', 'data' => $services]);
    }

    public function publicShow($slug)
    {
        $service = Service::where(function ($q) use ($slug) {
                $q->where('slug', $slug);
                if (is_numeric($slug)) {
                    $q->orWhere('id', (int) $slug);
                }
            })
            ->where('is_active', true)
            ->whereHas('category', function($q) {
                $q->where('is_active', true);
            })
            ->with(['category:id,name,slug', 'qualifiedStaff' => function($q) {
                $q->where('role', 'staff')
                  ->where('is_active', true)
                  ->with('profile:id,user_id,display_name,specialization,profile_photo_path,is_available');
            }])
            ->firstOrFail();

        $staff = $service->qualifiedStaff->map(function($user) {
            return [
                'id' => $user->id,
                'name' => $user->profile?->display_name ?? $user->name,
                'specialization' => $user->profile?->specialization,
                'profile_photo_url' => $user->profile?->profile_photo_path 
                    ? Storage::disk('images')->url($user->profile->profile_photo_path) 
                    : null,
            ];
        });

        $serviceData = $service->toArray();
        $serviceData['qualified_staff'] = $staff;
        unset($serviceData['qualifiedStaff']); // Clean up relation raw data

        return response()->json(['status' => 'success', 'data' => $serviceData]);
    }

    public function index(Request $request)
    {
        $services = Service::with('category')->withCount('qualifiedStaff')->orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['status' => 'success', 'data' => $services]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'service_category_id' => 'required|exists:service_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,webp|max:5120',
            'is_home_service' => 'nullable',
            'is_active' => 'nullable',
            'sort_order' => 'integer',
        ]);

        $validated['is_home_service'] = $request->has('is_home_service')
            ? filter_var($request->is_home_service, FILTER_VALIDATE_BOOLEAN)
            : true;
        $validated['is_active'] = $request->has('is_active')
            ? filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN)
            : true;

        $validated['slug'] = Str::slug($validated['name']);
        if (Service::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] .= '-' . time();
        }

        if ($request->hasFile('image')) {
            $validated['image_path'] = $request->file('image')->store('services', 'images');
        }

        $service = Service::create($validated);
        return response()->json(['status' => 'success', 'data' => $service->load('category')], 201);
    }

    public function show(Service $service)
    {
        return response()->json(['status' => 'success', 'data' => $service->load('category')->loadCount('qualifiedStaff')]);
    }

    public function update(Request $request, Service $service)
    {
        $validated = $request->validate([
            'service_category_id' => 'required|exists:service_categories,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'required|integer|min:1',
            'price' => 'required|numeric|min:0',
            'image' => 'nullable|image|mimes:jpeg,png,webp|max:5120',
            'is_home_service' => 'nullable',
            'is_active' => 'nullable',
            'sort_order' => 'integer',
        ]);

        if ($request->has('is_home_service')) {
            $validated['is_home_service'] = filter_var($request->is_home_service, FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->has('is_active')) {
            $validated['is_active'] = filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN);
        }

        if ($service->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']);
            if (Service::where('slug', $validated['slug'])->where('id', '!=', $service->id)->exists()) {
                $validated['slug'] .= '-' . time();
            }
        }

        if ($request->hasFile('image')) {
            if ($service->image_path) {
                Storage::disk('images')->delete($service->image_path);
            }
            $validated['image_path'] = $request->file('image')->store('services', 'images');
        }

        $service->update($validated);
        return response()->json(['status' => 'success', 'data' => $service->load('category')]);
    }

    public function destroy(Service $service)
    {
        if ($service->appointments()->exists()) {
            return response()->json([
                'status' => 'error',
                'message' => 'This service cannot be deleted because it has recorded appointments. You can deactivate it instead.'
            ], 422);
        }

        if ($service->image_path) {
            Storage::disk('images')->delete($service->image_path);
        }
        $service->qualifiedStaff()->detach();
        $service->delete();
        return response()->json(['status' => 'success']);
    }

    public function toggleActive(Request $request, Service $service)
    {
        $service->update(['is_active' => !$service->is_active]);
        return response()->json(['status' => 'success', 'data' => $service]);
    }
}
