<?php

namespace App\Http\Controllers;

use App\Models\ProductCategory;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductCategoryController extends Controller
{
    public function index()
    {
        return response()->json([
            'status' => 'success',
            'data' => ProductCategory::orderBy('sort_order')->orderBy('name')->get()
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:product_categories',
            'description' => 'nullable|string',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ]);

        $category = ProductCategory::create($validated);
        return response()->json(['status' => 'success', 'data' => $category], 201);
    }

    public function show(ProductCategory $productCategory)
    {
        return response()->json(['status' => 'success', 'data' => $productCategory]);
    }

    public function update(Request $request, ProductCategory $productCategory)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => ['required', 'string', 'max:255', Rule::unique('product_categories')->ignore($productCategory->id)],
            'description' => 'nullable|string',
            'sort_order' => 'integer',
            'is_active' => 'boolean',
        ]);

        $productCategory->update($validated);
        return response()->json(['status' => 'success', 'data' => $productCategory]);
    }
}
