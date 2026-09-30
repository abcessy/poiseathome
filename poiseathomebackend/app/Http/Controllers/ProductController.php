<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(['active', 'archived'])],
        ]);
        $query = Product::with(['category', 'inventory']);

        if (isset($validated['status'])) {
            $query->where('is_active', $validated['status'] === 'active');
        }

        if ($request->has('active_only')) {
            $query->where('is_active', true)->whereHas('category', function($q) {
                $q->where('is_active', true);
            });
        }

        $products = $query->orderBy('name')->get()->map(function($product) {
            $product->inventory_status = $product->inventory_status;
            return $product;
        });
        
        return response()->json(['status' => 'success', 'data' => $products]);
    }

    public function store(Request $request)
    {
        $isPiece = $request->input('unit') === 'piece';
        $quantityRule = $isPiece ? 'nullable|integer|min:0|max:100000' : 'nullable|numeric|min:0|max:100000';
        $thresholdRule = $isPiece ? 'required|integer|min:0|max:100000' : 'required|numeric|min:0|max:100000';

        $validated = $request->validate([
            'product_category_id' => 'required|exists:product_categories,id',
            'sku' => 'required|string|max:255|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:255',
            'unit' => 'required|string|in:piece,milliliter,gram,bottle,pack,tube,other',
            'cost_price' => 'nullable|numeric|min:0',
            'low_stock_threshold' => $thresholdRule,
            'is_active' => 'boolean',
            'initial_quantity' => $quantityRule,
        ], [
            'initial_quantity.integer' => 'Initial quantity must be a whole number for items counted in pieces.',
            'initial_quantity.max' => 'Initial quantity cannot exceed 100,000.',
            'low_stock_threshold.integer' => 'Low stock threshold must be a whole number for items counted in pieces.',
            'low_stock_threshold.max' => 'Low stock threshold cannot exceed 100,000.',
        ]);

        if ($request->has('cost_price')) {
            $cost = $request->input('cost_price');
            $validated['cost_price'] = ($cost === null || $cost === '') ? null : (float) $cost;
        }

        $product = Product::create($validated);

        $initialQuantity = $request->input('initial_quantity', 0);
        $this->inventoryService->initializeInventory($product, $initialQuantity, $request->user()->id);

        return response()->json(['status' => 'success', 'data' => $product->load('inventory')], 201);
    }

    public function show(Product $product)
    {
        $product->load(['category', 'inventory']);
        $product->inventory_status = $product->inventory_status;
        return response()->json(['status' => 'success', 'data' => $product]);
    }

    public function update(Request $request, Product $product)
    {
        $unit = $request->input('unit', $product->unit);
        $isPiece = $unit === 'piece';
        $thresholdRule = $isPiece ? 'required|integer|min:0|max:100000' : 'required|numeric|min:0|max:100000';

        $validated = $request->validate([
            'product_category_id' => 'required|exists:product_categories,id',
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:255',
            'unit' => 'required|string|in:piece,milliliter,gram,bottle,pack,tube,other',
            'cost_price' => 'nullable|numeric|min:0',
            'low_stock_threshold' => $thresholdRule,
            'is_active' => 'boolean',
        ], [
            'low_stock_threshold.integer' => 'Low stock threshold must be a whole number for items counted in pieces.',
            'low_stock_threshold.max' => 'Low stock threshold cannot exceed 100,000.',
        ]);

        if ($request->has('cost_price')) {
            $cost = $request->input('cost_price');
            $validated['cost_price'] = ($cost === null || $cost === '') ? null : (float) $cost;
        }

        $product->update($validated);
        $fresh = $product->fresh(['category', 'inventory']);
        $fresh->inventory_status = $fresh->inventory_status;
        return response()->json(['status' => 'success', 'data' => $fresh]);
    }

    public function archive(Product $product)
    {
        if (! $product->is_active) {
            return response()->json(['message' => 'Product is already archived.'], 422);
        }

        $product->update(['is_active' => false]);

        return response()->json([
            'status' => 'success',
            'message' => 'Product archived successfully.',
            'data' => $product->fresh(['category', 'inventory']),
        ]);
    }

    public function restore(Product $product)
    {
        if ($product->is_active) {
            return response()->json(['message' => 'Product is already active.'], 422);
        }

        $product->update(['is_active' => true]);

        return response()->json([
            'status' => 'success',
            'message' => 'Product restored successfully.',
            'data' => $product->fresh(['category', 'inventory']),
        ]);
    }
}
