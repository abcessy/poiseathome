<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->unsignedSmallInteger('extended_minutes')->default(0)->after('service_duration_minutes_snapshot');
            $table->json('additional_services')->nullable()->after('extended_minutes');
        });

        Schema::table('customer_reviews', function (Blueprint $table) {
            $table->foreignId('appointment_id')->nullable()->after('customer_id')->constrained('appointments')->nullOnDelete();
            $table->unsignedTinyInteger('stylist_rating')->nullable()->after('staff_user_id');
            $table->unsignedTinyInteger('shop_rating')->nullable()->after('stylist_rating');
            
            // Add non-unique index on customer_id before dropping unique index
            $table->index('customer_id', 'customer_reviews_customer_id_idx');
            $table->dropUnique('customer_reviews_customer_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customer_reviews', function (Blueprint $table) {
            $table->unique('customer_id', 'customer_reviews_customer_id_unique');
            $table->dropIndex('customer_reviews_customer_id_idx');
            $table->dropConstrainedForeignId('appointment_id');
            $table->dropColumn(['stylist_rating', 'shop_rating']);
        });

        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['extended_minutes', 'additional_services']);
        });
    }
};
