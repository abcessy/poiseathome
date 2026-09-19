<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $fillable = [
        'service_category_id',
        'name',
        'slug',
        'description',
        'duration_minutes',
        'price',
        'image_path',
        'is_home_service',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_home_service' => 'boolean',
            'is_active' => 'boolean',
            'price' => 'decimal:2',
            'duration_minutes' => 'integer',
        ];
    }

    public function category()
    {
        return $this->belongsTo(ServiceCategory::class, 'service_category_id');
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function qualifiedStaff()
    {
        return $this->belongsToMany(User::class, 'service_staff', 'service_id', 'staff_user_id')
            ->withTimestamps();
    }
}
