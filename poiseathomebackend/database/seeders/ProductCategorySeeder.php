<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCategory;

class ProductCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Hair Care', 'slug' => 'hair-care', 'description' => 'Shampoos and conditioners'],
            ['name' => 'Hair Color', 'slug' => 'hair-color', 'description' => 'Dyes and developers'],
            ['name' => 'Treatments', 'slug' => 'treatments', 'description' => 'Keratin and hair spa products'],
            ['name' => 'Styling', 'slug' => 'styling', 'description' => 'Gels, mousses, and sprays'],
            ['name' => 'Consumables', 'slug' => 'consumables', 'description' => 'Disposable items like gloves and foil'],
        ];

        foreach ($categories as $idx => $cat) {
            ProductCategory::firstOrCreate(
                ['slug' => $cat['slug']],
                ['name' => $cat['name'], 'description' => $cat['description'], 'sort_order' => $idx, 'is_active' => true]
            );
        }
    }
}
