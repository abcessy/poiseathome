<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceCategory;
use App\Models\Service;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ServiceSeeder extends Seeder
{
    public function run()
    {
        // Must have categories first
        $this->call(ServiceCategorySeeder::class);

        $womensCut = ServiceCategory::where('slug', 'womens-haircuts')->first();
        $mensCut = ServiceCategory::where('slug', 'mens-haircuts')->first();
        $color = ServiceCategory::where('slug', 'hair-coloring')->first();
        $treatment = ServiceCategory::where('slug', 'hair-treatments')->first();
        $styling = ServiceCategory::where('slug', 'styling-updos')->first();

        $services = [
            [
                'category_id' => $womensCut->id,
                'name' => 'Signature Layered Cut',
                'description' => 'A custom layered cut tailored to your face shape.',
                'duration_minutes' => 60,
                'price' => 850.00,
                'image_path' => 'services/signature-layered-cut.jpg',
            ],
            [
                'category_id' => $mensCut->id,
                'name' => 'Executive Men\'s Cut',
                'description' => 'Precision cut including wash and styling.',
                'duration_minutes' => 45,
                'price' => 500.00,
                'image_path' => 'services/executive-mens-cut.jpg',
            ],
            [
                'category_id' => $color->id,
                'name' => 'Full Balayage',
                'description' => 'Hand-painted highlights for a natural, sun-kissed look.',
                'duration_minutes' => 180,
                'price' => 3500.00,
                'image_path' => 'services/full-balayage.jpg',
            ],
            [
                'category_id' => $treatment->id,
                'name' => 'Keratin Smoothing Treatment',
                'description' => 'Eliminates frizz and smooths hair for up to 3 months.',
                'duration_minutes' => 120,
                'price' => 2500.00,
                'image_path' => 'services/keratin-smoothing-treatment.jpg',
            ],
            [
                'category_id' => $styling?->id ?? 5,
                'name' => 'Event Styling & Blowout',
                'description' => 'Glamorous hair blowout and signature heat styling for special occasions.',
                'duration_minutes' => 60,
                'price' => 1200.00,
                'image_path' => 'services/signature-layered-cut.jpg',
            ],
            [
                'category_id' => $styling?->id ?? 5,
                'name' => 'Formal Hair Updo',
                'description' => 'Artfully sculpted updo ideal for weddings, galas, and formal celebrations.',
                'duration_minutes' => 90,
                'price' => 1800.00,
                'image_path' => 'services/keratin-smoothing-treatment.jpg',
            ],
        ];

        foreach ($services as $svc) {
            $sourcePath = database_path('seeders/assets/'.$svc['image_path']);

            if (!empty($svc['image_path']) && file_exists($sourcePath) && ! Storage::disk('images')->exists($svc['image_path'])) {
                Storage::disk('images')->put($svc['image_path'], file_get_contents($sourcePath));
            }

            Service::updateOrCreate(
                ['slug' => Str::slug($svc['name'])],
                [
                    'service_category_id' => $svc['category_id'],
                    'name' => $svc['name'],
                    'description' => $svc['description'],
                    'duration_minutes' => $svc['duration_minutes'],
                    'price' => $svc['price'],
                    'is_home_service' => true,
                    'is_active' => true,
                    'image_path' => $svc['image_path'],
                ]
            );
        }
    }
}
