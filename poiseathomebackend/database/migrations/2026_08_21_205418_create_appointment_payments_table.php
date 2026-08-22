<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained()->restrictOnDelete();
            
            $table->enum('payment_type', ['downpayment', 'balance', 'full_payment']);
            $table->string('payment_method');
            
            $table->decimal('amount', 10, 2);
            $table->string('reference_number')->nullable();
            $table->string('proof_path')->nullable();
            
            $table->enum('status', ['pending_verification', 'verified', 'rejected'])->default('pending_verification');
            
            $table->timestamp('submitted_at');
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            
            $table->text('rejection_reason')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_payments');
    }
};
