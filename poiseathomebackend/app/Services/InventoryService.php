<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductInventory;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Exception;
use Illuminate\Support\Facades\Log;

class InventoryService
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService = null)
    {
        $this->notificationService = $notificationService ?? app(NotificationService::class);
    }

    public function initializeInventory(Product $product, float $initialQuantity, ?int $userId = null)
    {
        if ($initialQuantity < 0) {
            throw new Exception("Initial quantity cannot be negative.");
        }

        return DB::transaction(function () use ($product, $initialQuantity, $userId) {
            $inventory = ProductInventory::create([
                'product_id' => $product->id,
                'available_quantity' => $initialQuantity,
            ]);

            if ($initialQuantity > 0) {
                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => 'initial_stock',
                    'quantity' => $initialQuantity,
                    'quantity_before' => 0,
                    'quantity_after' => $initialQuantity,
                    'reference_type' => null,
                    'reference_id' => null,
                    'notes' => 'Initial stock',
                    'performed_by' => $userId,
                ]);
            }

            return $inventory;
        });
    }

    public function adjustStock(Product $product, string $type, float $quantity, ?int $userId, string $notes = '', ?string $referenceType = null, ?int $referenceId = null)
    {
        if ($quantity <= 0) {
            throw new Exception("Quantity must be greater than zero.", 422);
        }

        if ($quantity > 100000) {
            throw new Exception("Quantity cannot exceed 100,000.", 422);
        }

        if ($product->unit === 'piece' && floor($quantity) != $quantity) {
            throw new Exception("Quantity must be a whole number for items counted in pieces.", 422);
        }

        if (!in_array($type, ['stock_in', 'stock_out', 'adjustment_in', 'adjustment_out', 'appointment_usage', 'appointment_usage_reversal'])) {
            throw new Exception("Invalid movement type.", 422);
        }

        return DB::transaction(function () use ($product, $type, $quantity, $userId, $notes, $referenceType, $referenceId) {
            $inventory = ProductInventory::where('product_id', $product->id)->lockForUpdate()->first();
            
            if (!$inventory) {
                $inventory = ProductInventory::create(['product_id' => $product->id, 'available_quantity' => 0]);
            }

            $before = $inventory->available_quantity;
            $after = $before;

            $isAddition = in_array($type, ['stock_in', 'adjustment_in', 'appointment_usage_reversal']);
            
            if ($isAddition) {
                $after = $before + $quantity;
            } else {
                if ($before < $quantity) {
                    throw new Exception("There is not enough stock available for this operation.", 422);
                }
                $after = $before - $quantity;
            }

            $inventory->available_quantity = $after;

            $threshold = (float) $product->low_stock_threshold;
            $qty = (float) $inventory->available_quantity;

            $alerts = [];

            if ($qty == 0) {
                if (!$inventory->out_of_stock_alert_active) {
                    $inventory->out_of_stock_alert_active = true;
                    $alerts[] = 'out_of_stock';
                }
                // When out of stock, it's not strictly 'low stock' anymore
                $inventory->low_stock_alert_active = false;
            } elseif ($qty <= $threshold) {
                if (!$inventory->low_stock_alert_active) {
                    $inventory->low_stock_alert_active = true;
                    $alerts[] = 'low_stock';
                }
                $inventory->out_of_stock_alert_active = false;
            } else {
                // Recovered
                $inventory->low_stock_alert_active = false;
                $inventory->out_of_stock_alert_active = false;
            }

            $inventory->save();

            $movement = StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => $type,
                'quantity' => $quantity,
                'quantity_before' => $before,
                'quantity_after' => $after,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'notes' => $notes,
                'performed_by' => $userId,
            ]);

            try {
                DB::afterCommit(function () use ($alerts, $product) {
                    foreach ($alerts as $alert) {
                        if ($alert === 'out_of_stock') {
                            $this->notificationService->notifyAdmins([
                                'type' => 'out_of_stock',
                                'title' => 'Out of Stock Alert',
                                'message' => "Product '{$product->name}' (SKU: {$product->sku}) is now out of stock.",
                                'reference_type' => 'product',
                                'reference_id' => $product->id,
                            ]);
                        } elseif ($alert === 'low_stock') {
                            $this->notificationService->notifyAdmins([
                                'type' => 'low_stock',
                                'title' => 'Low Stock Alert',
                                'message' => "Product '{$product->name}' (SKU: {$product->sku}) is running low.",
                                'reference_type' => 'product',
                                'reference_id' => $product->id,
                            ]);
                        }
                    }
                });
            } catch (Exception $e) {
                Log::error('Inventory notifications failed: ' . $e->getMessage());
            }

            return $movement;
        });
    }
}
