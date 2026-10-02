<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_category_id',
        'sku',
        'name',
        'description',
        'brand',
        'unit',
        'cost_price',
        'low_stock_threshold',
        'is_active',
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'low_stock_threshold' => 'decimal:3',
        'is_active' => 'boolean',
    ];

    public function category()
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function inventory()
    {
        return $this->hasOne(ProductInventory::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getInventoryStatusAttribute()
    {
        if (!$this->inventory) return 'out_of_stock';
        $qty = $this->inventory->available_quantity;
        if ($qty <= 0) return 'out_of_stock';
        if ($qty <= $this->low_stock_threshold) return 'low_stock';
        return 'in_stock';
    }
}
