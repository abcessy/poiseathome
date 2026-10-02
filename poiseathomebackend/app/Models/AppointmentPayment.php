<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentPayment extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'payment_type',
        'payment_method',
        'amount',
        'reference_number',
        'proof_path',
        'status',
        'submitted_at',
        'verified_at',
        'verified_by',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'verified_at' => 'datetime',
    ];

    protected $hidden = [
        'proof_path',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
