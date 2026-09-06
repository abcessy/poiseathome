<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class StaffInventoryController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index()
    {
        // Only return active products and active categories
        $products = Product::where('is_active', true)
            ->whereHas('category', function($q) {
                $q->where('is_active', true);
            })
            ->with(['category', 'inventory'])
            ->orderBy('name')
            ->get()
            ->map(function($product) {
                // Do not expose cost_price to staff
                unset($product->cost_price);
                $product->inventory_status = $product->inventory_status;
                return $product;
            });

        return response()->json(['status' => 'success', 'data' => $products]);
    }

    public function show(Product $product)
    {
        $this->ensureProductIsActive($product);
        $product->load(['category', 'inventory']);
        unset($product->cost_price);
        $product->inventory_status = $product->inventory_status;
        return response()->json(['status' => 'success', 'data' => $product]);
    }

    public function stockIn(Request $request, Product $product)
    {
        $this->ensureProductIsActive($product);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'nullable|string'
        ]);

        try {
            $this->inventoryService->adjustStock(
                $product,
                'stock_in',
                $validated['quantity'],
                $request->user()->id,
                $validated['notes'] ?? ''
            );
            $fresh = $product->fresh('inventory');
            unset($fresh->cost_price);
            return response()->json(['status' => 'success', 'data' => $fresh]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function stockOut(Request $request, Product $product)
    {
        $this->ensureProductIsActive($product);

        $validated = $request->validate([
            'quantity' => 'required|numeric|min:0.001',
            'notes' => 'required|string'
        ]);

        try {
            $this->inventoryService->adjustStock(
                $product,
                'stock_out',
                $validated['quantity'],
                $request->user()->id,
                $validated['notes']
            );
            $fresh = $product->fresh('inventory');
            unset($fresh->cost_price);
            return response()->json(['status' => 'success', 'data' => $fresh]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INSUFFICIENT_STOCK',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    public function adjust(Request $request, Product $product)
    {
        $this->ensureProductIsActive($product);

        $validated = $request->validate([
            'type' => 'required|in:adjustment_in,adjustment_out',
            'quantity' => 'required|numeric|min:0.001',
            'reason' => 'required|string'
        ]);

        try {
            $this->inventoryService->adjustStock(
                $product,
                $validated['type'],
                $validated['quantity'],
                $request->user()->id,
                $validated['reason']
            );
            $fresh = $product->fresh('inventory');
            unset($fresh->cost_price);
            return response()->json(['status' => 'success', 'data' => $fresh]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INSUFFICIENT_STOCK',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    public function movements(Product $product)
    {
        $movements = $product->stockMovements()->with('user')->orderBy('created_at', 'desc')->get();
        return response()->json(['status' => 'success', 'data' => $movements]);
    }

    private function ensureProductIsActive(Product $product): void
    {
        abort_unless($product->is_active && $product->category?->is_active, 422, 'Archived products cannot be adjusted.');
    }
}
