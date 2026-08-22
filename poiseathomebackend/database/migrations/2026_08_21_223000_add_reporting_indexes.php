<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->index(['status', 'appointment_date']);
            $table->index('staff_user_id');
        });

        Schema::table('appointment_payments', function (Blueprint $table) {
            $table->index(['status', 'submitted_at']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index(['product_id', 'created_at']);
        });
        
        Schema::table('appointment_product_usages', function (Blueprint $table) {
            $table->index(['appointment_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['status', 'appointment_date']);
            $table->dropIndex(['staff_user_id']);
        });

        Schema::table('appointment_payments', function (Blueprint $table) {
            $table->dropIndex(['status', 'submitted_at']);
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'created_at']);
        });

        Schema::table('appointment_product_usages', function (Blueprint $table) {
            $table->dropIndex(['appointment_id', 'created_at']);
        });
    }
};
