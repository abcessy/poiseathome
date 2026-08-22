<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            $table->timestamp('verified_at')->nullable()->after('expires_at');
            $table->string('authorization_hash', 64)->nullable()->after('verified_at');
            $table->timestamp('authorization_expires_at')->nullable()->after('authorization_hash');
            $table->index(['user_id', 'purpose', 'consumed_at'], 'verification_codes_active_lookup');
        });
    }

    public function down(): void
    {
        Schema::table('verification_codes', function (Blueprint $table) {
            $table->dropIndex('verification_codes_active_lookup');
            $table->dropColumn(['verified_at', 'authorization_hash', 'authorization_expires_at']);
        });
    }
};
