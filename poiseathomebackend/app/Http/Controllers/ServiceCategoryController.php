<?php

namespace App\Http\Controllers;

use App\Models\ServiceCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ServiceCategoryController extends Controller
{
    public function publicIndex()
    {
        $categories = ServiceCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    public function index()
    {
        $categories = ServiceCategory::orderBy('sort_order')->orderBy('name')->get();
        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sort_order' => 'integer',
            'is_active' => 'boolean'
        ]);
        
        $validated['slug'] = Str::slug($validated['name']);

        // ensure slug uniqueness
        if (ServiceCategory::where('slug', $validated['slug'])->exists()) {
            $validated['slug'] .= '-' . time();
        }

        $category = ServiceCategory::create($validated);
        return response()->json(['status' => 'success', 'data' => $category], 201);
    }

    public function show(ServiceCategory $serviceCategory)
    {
        return response()->json(['status' => 'success', 'data' => $serviceCategory]);
    }

    public function update(Request $request, ServiceCategory $serviceCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'sort_order' => 'integer',
            'is_active' => 'boolean'
        ]);

        if ($serviceCategory->name !== $validated['name']) {
            $validated['slug'] = Str::slug($validated['name']);
            if (ServiceCategory::where('slug', $validated['slug'])->where('id', '!=', $serviceCategory->id)->exists()) {
                $validated['slug'] .= '-' . time();
            }
        }

        $serviceCategory->update($validated);
        return response()->json(['status' => 'success', 'data' => $serviceCategory]);
    }

    public function destroy(ServiceCategory $serviceCategory)
    {
        // For safety, only allow delete if no services attached, otherwise suggest deactivate.
        if ($serviceCategory->services()->count() > 0) {
            return response()->json(['message' => 'Cannot delete category with attached services. Please deactivate instead.'], 400);
        }
        $serviceCategory->delete();
        return response()->json(['status' => 'success']);
    }

    public function toggleActive(Request $request, ServiceCategory $serviceCategory)
    {
        $serviceCategory->update(['is_active' => !$serviceCategory->is_active]);
        return response()->json(['status' => 'success', 'data' => $serviceCategory]);
    }
}
