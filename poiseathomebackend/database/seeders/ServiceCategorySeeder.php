<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceCategory;
use Illuminate\Support\Str;

class ServiceCategorySeeder extends Seeder
{
    public function run()
    {
        $categories = [
            ['name' => "Women's Haircuts", 'description' => 'Professional cutting and styling for women.'],
            ['name' => "Men's Haircuts", 'description' => 'Classic and modern cuts for men.'],
            ['name' => 'Hair Coloring', 'description' => 'Full color, highlights, balayage, and touch-ups.'],
            ['name' => 'Hair Treatments', 'description' => 'Deep conditioning, keratin, and scalp care.'],
            ['name' => 'Styling & Updos', 'description' => 'Event styling, blowouts, and curling.']
        ];

        foreach ($categories as $i => $cat) {
            ServiceCategory::firstOrCreate(
                ['slug' => Str::slug($cat['name'])],
                [
                    'name' => $cat['name'],
                    'description' => $cat['description'],
                    'sort_order' => $i,
                    'is_active' => true
                ]
            );
        }
    }
}
