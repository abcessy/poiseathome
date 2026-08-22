<?php

namespace Database\Seeders;

use App\Models\Service;
use App\Models\StaffProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $staffPassword = env('DEMO_STAFF_PASSWORD', 'Staff123!');
        $customerPassword = env('DEMO_CUSTOMER_PASSWORD', 'Customer123!');

        $staffAccounts = [
            [
                'name' => 'Maria Santos',
                'email' => 'maria.santos@poiseathome.local',
                'contact_number' => '09171234567',
                'specialization' => 'Women’s cuts, styling, and treatments',
                'bio' => 'Senior Poise hairstylist specializing in personalized cuts and polished home styling.',
                'image_path' => 'staff/maria-santos.jpg',
            ],
            [
                'name' => 'Angela Reyes',
                'email' => 'angela.reyes@poiseathome.local',
                'contact_number' => '09181234567',
                'specialization' => 'Hair coloring and keratin treatments',
                'bio' => 'Poise color specialist experienced in balayage, full color, and smoothing treatments.',
                'image_path' => 'staff/angela-reyes.jpg',
            ],
        ];

        foreach ($staffAccounts as $account) {
            $sourcePath = database_path('seeders/assets/'.$account['image_path']);

            if (! Storage::disk('images')->exists($account['image_path'])) {
                Storage::disk('images')->put($account['image_path'], file_get_contents($sourcePath));
            }

            $staff = User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'contact_number' => $account['contact_number'],
                    'password' => Hash::make($staffPassword),
                    'role' => 'staff',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );

            $staff->update(['avatar_path' => $account['image_path']]);

            StaffProfile::updateOrCreate(
                ['user_id' => $staff->id],
                [
                    'display_name' => $account['name'],
                    'specialization' => $account['specialization'],
                    'bio' => $account['bio'],
                    'profile_photo_path' => $account['image_path'],
                    'is_available' => true,
                ],
            );

            $staff->services()->syncWithoutDetaching(Service::query()->pluck('id'));
        }

        $customers = [
            [
                'name' => 'Sofia Cruz',
                'email' => 'sofia.cruz@poiseathome.local',
                'contact_number' => '09192345678',
                'address' => '24 Sampaguita Street, Barangay San Isidro, Quezon City, Metro Manila',
            ],
            [
                'name' => 'Bianca Mendoza',
                'email' => 'bianca.mendoza@poiseathome.local',
                'contact_number' => '09203456789',
                'address' => '18 Rosal Avenue, Barangay Kapitolyo, Pasig City, Metro Manila',
            ],
        ];

        foreach ($customers as $account) {
            User::firstOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'contact_number' => $account['contact_number'],
                    'address' => $account['address'],
                    'password' => Hash::make($customerPassword),
                    'role' => 'customer',
                    'is_active' => true,
                    'email_verified_at' => now(),
                ],
            );
        }
    }
}
