<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Services\InventoryService;

use App\Models\User;

class ProductSeeder extends Seeder
{
    public function run(InventoryService $inventoryService): void
    {
        $admin = User::where('role', 'admin')->first();
        $adminId = $admin ? $admin->id : null;

        $hairColorCat = ProductCategory::where('slug', 'hair-color')->first();
        $treatmentsCat = ProductCategory::where('slug', 'treatments')->first();
        $consumablesCat = ProductCategory::where('slug', 'consumables')->first();

        if (!$hairColorCat || !$treatmentsCat || !$consumablesCat) return;

        $products = [
            [
                'product_category_id' => $hairColorCat->id,
                'sku' => 'HC-001',
                'name' => 'Loreal Majirel 5.0 Light Brown',
                'unit' => 'tube',
                'low_stock_threshold' => 10,
                'initial_quantity' => 50
            ],
            [
                'product_category_id' => $hairColorCat->id,
                'sku' => 'HC-002',
                'name' => 'Developer 20 Vol',
                'unit' => 'milliliter',
                'low_stock_threshold' => 1000,
                'initial_quantity' => 5000
            ],
            [
                'product_category_id' => $treatmentsCat->id,
                'sku' => 'TR-001',
                'name' => 'Brazilian Keratin Solution',
                'unit' => 'milliliter',
                'low_stock_threshold' => 500,
                'initial_quantity' => 2000
            ],
            [
                'product_category_id' => $consumablesCat->id,
                'sku' => 'CS-001',
                'name' => 'Nitrile Gloves (Black, Medium)',
                'unit' => 'piece',
                'low_stock_threshold' => 100,
                'initial_quantity' => 500
            ],
        ];

        foreach ($products as $p) {
            $product = Product::where('sku', $p['sku'])->first();
            if (!$product) {
                $initialQty = $p['initial_quantity'];
                unset($p['initial_quantity']);
                $p['is_active'] = true;
                
                $newProduct = Product::create($p);
                $inventoryService->initializeInventory($newProduct, $initialQty, $adminId);
            }
        }
    }
}
