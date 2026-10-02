<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $adminEmail = env('ADMIN_EMAIL', 'admin@poiseathome.local');
        $adminName = env('ADMIN_NAME', 'PoiseAtHome Administrator');
        $adminPassword = env('ADMIN_PASSWORD', 'change_this_admin_password');

        \App\Models\User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => $adminName,
                'password' => \Illuminate\Support\Facades\Hash::make($adminPassword),
                'role' => 'admin',
                'is_active' => true,
                'email_verified_at' => now(),
            ]
        );
    }
}
