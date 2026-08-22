<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class StaffInventoryController extends Controller
{
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
}
