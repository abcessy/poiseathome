<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentProductUsage extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'product_id',
        'quantity',
        'recorded_by',
        'notes',
        'stock_movement_id',
        'reversed_at',
        'reversed_by',
        'reversal_movement_id',
        'reversal_reason',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'reversed_at' => 'datetime',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function recorder()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function reverser()
    {
        return $this->belongsTo(User::class, 'reversed_by');
    }

    public function stockMovement()
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }
}
