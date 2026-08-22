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
        $query = Product::with(['category', 'inventory']);
        
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
        $validated = $request->validate([
            'product_category_id' => 'required|exists:product_categories,id',
            'sku' => 'required|string|max:255|unique:products',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:255',
            'unit' => 'required|string|in:piece,milliliter,gram,bottle,pack,tube,other',
            'cost_price' => 'nullable|numeric|min:0',
            'low_stock_threshold' => 'required|numeric|min:0',
            'is_active' => 'boolean',
            'initial_quantity' => 'nullable|numeric|min:0',
        ]);

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
        $validated = $request->validate([
            'product_category_id' => 'required|exists:product_categories,id',
            'sku' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($product->id)],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'brand' => 'nullable|string|max:255',
            'unit' => 'required|string|in:piece,milliliter,gram,bottle,pack,tube,other',
            'cost_price' => 'nullable|numeric|min:0',
            'low_stock_threshold' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $product->update($validated);
        return response()->json(['status' => 'success', 'data' => $product->fresh('inventory')]);
    }
}
