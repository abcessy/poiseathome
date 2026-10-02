<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\InventoryService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request)
    {
        $products = Product::where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('is_active', true))
            ->with(['category', 'inventory'])->get()->map(function($product) {
            $product->inventory_status = $product->inventory_status;
            return $product;
        });

        if ($request->filled('status')) {
            $products = $products->filter(function($product) use ($request) {
                return $product->inventory_status === $request->status;
            })->values();
        }

        return response()->json(['status' => 'success', 'data' => $products]);
    }

    public function stockIn(Request $request, Product $product)
    {
        $this->ensureProductIsActive($product);

        $validated = $request->validate([
            'quantity' => $this->quantityRules($product),
            'notes' => 'nullable|string'
        ], $this->quantityValidationMessages());

        try {
            $this->inventoryService->adjustStock(
                $product,
                'stock_in',
                $validated['quantity'],
                $request->user()->id,
                $validated['notes'] ?? ''
            );
            return response()->json(['status' => 'success', 'data' => $product->fresh('inventory')]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function stockOut(Request $request, Product $product)
    {
        $this->ensureProductIsActive($product);

        $validated = $request->validate([
            'quantity' => $this->quantityRules($product),
            'notes' => 'required|string'
        ], $this->quantityValidationMessages());

        try {
            $this->inventoryService->adjustStock(
                $product,
                'stock_out',
                $validated['quantity'],
                $request->user()->id,
                $validated['notes']
            );
            return response()->json(['status' => 'success', 'data' => $product->fresh('inventory')]);
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
            'quantity' => $this->quantityRules($product),
            'reason' => 'required|string'
        ], $this->quantityValidationMessages());

        try {
            $this->inventoryService->adjustStock(
                $product,
                $validated['type'],
                $validated['quantity'],
                $request->user()->id,
                $validated['reason']
            );
            return response()->json(['status' => 'success', 'data' => $product->fresh('inventory')]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'code' => 'INSUFFICIENT_STOCK',
                'message' => $e->getMessage()
            ], 422);
        }
    }

    private function quantityRules(Product $product): array
    {
        if ($product->unit === 'piece') {
            return ['required', 'integer', 'min:1', 'max:100000'];
        }
        return ['required', 'numeric', 'min:0.001', 'max:100000'];
    }

    private function quantityValidationMessages(): array
    {
        return [
            'quantity.integer' => 'The quantity must be a whole number for items counted in pieces.',
            'quantity.max' => 'The quantity cannot exceed 100,000.',
            'quantity.min' => 'The quantity must be at least :min.',
        ];
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
