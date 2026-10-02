<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\Product;
use App\Models\AppointmentProductUsage;
use App\Services\InventoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class AppointmentProductUsageController extends Controller
{
    protected $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    public function index(Request $request, Appointment $appointment)
    {
        // Admin or the assigned staff
        if ($request->user()->role === 'staff' && $appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $usages = $appointment->productUsages()->with(['product', 'recorder', 'reverser'])->get();
        return response()->json(['status' => 'success', 'data' => $usages]);
    }

    public function store(Request $request, Appointment $appointment)
    {
        if ($request->user()->role === 'staff' && $appointment->staff_user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($appointment->status !== 'in_progress') {
            return response()->json(['message' => 'Product usage can only be recorded when the appointment is in progress.'], 400);
        }

        $product = Product::find($request->input('product_id'));
        if (!$product || !$product->is_active || !$product->category?->is_active) {
            return response()->json(['message' => 'This product is inactive and cannot be used.'], 400);
        }

        $quantityRule = $product->unit === 'piece'
            ? ['required', 'integer', 'min:1', 'max:100000']
            : ['required', 'numeric', 'min:0.001', 'max:100000'];

        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => $quantityRule,
            'notes' => 'nullable|string'
        ], [
            'quantity.integer' => 'The quantity must be a whole number for items counted in pieces.',
            'quantity.max' => 'The quantity cannot exceed 100,000.',
            'quantity.min' => 'The quantity must be at least :min.',
        ]);

        try {
            DB::transaction(function () use ($product, $validated, $appointment, $request) {
                // Adjust stock
                $movement = $this->inventoryService->adjustStock(
                    $product,
                    'appointment_usage',
                    $validated['quantity'],
                    $request->user()->id,
                    $validated['notes'] ?? '',
                    'appointment',
                    $appointment->id
                );

                // Record usage
                AppointmentProductUsage::create([
                    'appointment_id' => $appointment->id,
                    'product_id' => $product->id,
                    'quantity' => $validated['quantity'],
                    'recorded_by' => $request->user()->id,
                    'notes' => $validated['notes'] ?? null,
                    'stock_movement_id' => $movement->id,
                ]);
            });

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'code' => $e->getCode() === 422 ? 'INSUFFICIENT_STOCK' : 'USAGE_FAILED',
                'message' => $e->getMessage()
            ], $e->getCode() ?: 400);
        }
    }

    public function reverse(Request $request, Appointment $appointment, AppointmentProductUsage $usage)
    {
        if ($usage->appointment_id !== $appointment->id) {
            return response()->json(['message' => 'Mismatch'], 400);
        }

        if ($request->user()->role === 'staff') {
            if ($appointment->staff_user_id !== $request->user()->id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            if ($appointment->status === 'completed') {
                return response()->json(['message' => 'Only admins can reverse usage after completion.'], 403);
            }
        }

        try {
            DB::transaction(function () use ($usage, $request) {
                $usage = AppointmentProductUsage::where('id', $usage->id)->lockForUpdate()->first();

                if ($usage->reversed_at) {
                    throw new Exception("This usage has already been reversed.", 400);
                }

                $movement = $this->inventoryService->adjustStock(
                    $usage->product,
                    'appointment_usage_reversal',
                    $usage->quantity,
                    $request->user()->id,
                    'Reversal of usage ID: ' . $usage->id,
                    'appointment',
                    $usage->appointment_id
                );

                $usage->update([
                    'reversed_at' => now(),
                    'reversed_by' => $request->user()->id,
                    'reversal_movement_id' => $movement->id,
                    'reversal_reason' => $request->input('reason', 'User reversed usage')
                ]);
            });

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], $e->getCode() ?: 400);
        }
    }
}
