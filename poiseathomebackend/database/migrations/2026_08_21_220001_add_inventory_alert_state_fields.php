<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_inventories', function (Blueprint $table) {
            $table->boolean('low_stock_alert_active')->default(false)->after('available_quantity');
            $table->boolean('out_of_stock_alert_active')->default(false)->after('low_stock_alert_active');
        });
    }

    public function down(): void
    {
        Schema::table('product_inventories', function (Blueprint $table) {
            $table->dropColumn(['low_stock_alert_active', 'out_of_stock_alert_active']);
        });
    }
};
