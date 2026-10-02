<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerReview extends Model
{
    protected $fillable = [
        'customer_id',
        'appointment_id',
        'staff_user_id',
        'stylist_rating',
        'shop_rating',
        'rating',
        'comment',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'stylist_rating' => 'integer',
            'shop_rating' => 'integer',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointment::class, 'appointment_id');
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }
}
