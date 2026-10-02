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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->string('appointment_number')->unique();
            $table->foreignId('customer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('staff_user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            
            $table->date('appointment_date');
            $table->time('start_time');
            $table->time('end_time');
            
            $table->string('service_name_snapshot');
            $table->decimal('service_price_snapshot', 10, 2);
            $table->integer('service_duration_minutes_snapshot');
            
            $table->string('customer_name_snapshot');
            $table->string('customer_contact_snapshot')->nullable();
            
            $table->text('service_address');
            $table->text('address_notes')->nullable();
            
            $table->text('customer_notes')->nullable();
            $table->text('internal_notes')->nullable();
            
            $table->enum('status', ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'])->default('pending');
            
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('cancellation_reason')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            
            $table->timestamps();

            // Indexes for availability checking
            $table->index(['staff_user_id', 'appointment_date', 'status']);
            $table->index('customer_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
