<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, \Laravel\Sanctum\HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'avatar_path',
        'contact_number',
        'address',
        'role',
        'is_active',
        'email_verified_at',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function profile()
    {
        return $this->hasOne(StaffProfile::class);
    }

    public function daysOff()
    {
        return $this->hasMany(StaffDayOff::class, 'staff_user_id');
    }

    public function services()
    {
        return $this->belongsToMany(Service::class, 'service_staff', 'staff_user_id', 'service_id')
            ->withTimestamps();
    }

    public function review()
    {
        return $this->hasOne(CustomerReview::class, 'customer_id');
    }
}
