<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->time('working_start_time')->default('09:00:00')->after('is_available');
            $table->time('working_end_time')->default('18:00:00')->after('working_start_time');
        });
    }

    public function down(): void
    {
        Schema::table('staff_profiles', function (Blueprint $table) {
            $table->dropColumn(['working_start_time', 'working_end_time']);
        });
    }
};
