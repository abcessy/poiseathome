<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    protected $fillable = [
        'appointment_number',
        'customer_id',
        'staff_user_id',
        'service_id',
        'appointment_date',
        'start_time',
        'end_time',
        'service_name_snapshot',
        'service_price_snapshot',
        'required_downpayment_amount',
        'service_duration_minutes_snapshot',
        'extended_minutes',
        'additional_services',
        'customer_name_snapshot',
        'customer_contact_snapshot',
        'service_address',
        'address_notes',
        'customer_notes',
        'internal_notes',
        'status',
        'cancelled_by',
        'cancellation_reason',
        'cancelled_at',
        'confirmed_at',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'appointment_date' => 'date:Y-m-d',
            'service_price_snapshot' => 'decimal:2',
            'required_downpayment_amount' => 'decimal:2',
            'extended_minutes' => 'integer',
            'additional_services' => 'array',
            'cancelled_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function service()
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function canceller()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    public function payments()
    {
        return $this->hasMany(AppointmentPayment::class);
    }

    public function productUsages()
    {
        return $this->hasMany(AppointmentProductUsage::class);
    }

    public function review()
    {
        return $this->hasOne(CustomerReview::class);
    }
}
