<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->decimal('required_downpayment_amount', 10, 2)->after('service_price_snapshot')->default(0);
        });

        $percentage = config('poiseathome.payment.downpayment_percentage', 30);
        \Illuminate\Support\Facades\DB::table('appointments')->update([
            'required_downpayment_amount' => \Illuminate\Support\Facades\DB::raw("ROUND(service_price_snapshot * {$percentage} / 100, 2)")
        ]);
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn('required_downpayment_amount');
        });
    }
};
