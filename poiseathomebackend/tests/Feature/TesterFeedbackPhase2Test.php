<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\ProductCategory;
use App\Models\Product;
use App\Models\ServiceCategory;
use App\Models\Service;
use App\Models\Appointment;

class TesterFeedbackPhase2Test extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $staff;
    protected $customer;
    protected $category;
    protected $pieceProduct;
    protected $liquidProduct;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->staff = User::factory()->create(['role' => 'staff', 'contact_number' => '09171234567']);
        $this->staff->profile()->create(['is_available' => true]);
        $this->customer = User::factory()->create(['role' => 'customer', 'contact_number' => '09181234567']);

        $this->category = ProductCategory::create(['name' => 'Hair Care', 'slug' => 'hair-care', 'is_active' => true]);

        $this->pieceProduct = Product::create([
            'product_category_id' => $this->category->id,
            'sku' => 'PIECE-01',
            'name' => 'Hair Brush',
            'unit' => 'piece',
            'low_stock_threshold' => 5,
            'is_active' => true,
        ]);
        $this->pieceProduct->inventory()->create(['available_quantity' => 20]);

        $this->liquidProduct = Product::create([
            'product_category_id' => $this->category->id,
            'sku' => 'LIQUID-01',
            'name' => 'Shampoo Bottle',
            'unit' => 'milliliter',
            'low_stock_threshold' => 100,
            'is_active' => true,
        ]);
        $this->liquidProduct->inventory()->create(['available_quantity' => 500]);
    }

    public function test_registration_accepts_valid_philippine_phone_09_and_plus639(): void
    {
        $res1 = $this->postJson('/api/v1/auth/register', [
            'name' => 'User One',
            'email' => 'user1@example.com',
            'contact_number' => '09171234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ]);
        $res1->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'user1@example.com', 'contact_number' => '09171234567']);

        $res2 = $this->postJson('/api/v1/auth/register', [
            'name' => 'User Two',
            'email' => 'user2@example.com',
            'contact_number' => '+639181234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ]);
        $res2->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'user2@example.com', 'contact_number' => '+639181234567']);
    }

    public function test_registration_normalizes_spaces_and_hyphens(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'name' => 'Formatted User',
            'email' => 'formatted@example.com',
            'contact_number' => '0917-123-4567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ]);
        $res->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'formatted@example.com', 'contact_number' => '09171234567']);
    }

    public function test_registration_rejects_invalid_phone_formats(): void
    {
        // 12 digits (Ria Angela defect)
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bad Phone 1',
            'email' => 'bad1@example.com',
            'contact_number' => '090531559600',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');

        // 18 digits (Gian Carlo defect)
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bad Phone 2',
            'email' => 'bad2@example.com',
            'contact_number' => '091234567890123456',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');

        // Letters (Hazel Ann defect)
        $this->postJson('/api/v1/auth/register', [
            'name' => 'Bad Phone 3',
            'email' => 'bad3@example.com',
            'contact_number' => '0917abc4567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms_accepted' => true,
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');
    }

    public function test_admin_staff_creation_and_update_validates_philippine_phone(): void
    {
        $this->actingAs($this->admin);

        // Invalid phone on store
        $this->postJson('/api/v1/admin/staff', [
            'name' => 'New Staff',
            'email' => 'newstaff@example.com',
            'contact_number' => '12345',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');

        // Valid phone on store
        $res = $this->postJson('/api/v1/admin/staff', [
            'name' => 'New Staff',
            'email' => 'newstaff@example.com',
            'contact_number' => '09221234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);
        $res->assertStatus(201);
        $newStaff = User::where('email', 'newstaff@example.com')->first();

        // Invalid phone on update
        $this->putJson("/api/v1/admin/staff/{$newStaff->id}", [
            'contact_number' => '08123456789',
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');

        // Valid phone on update
        $this->putJson("/api/v1/admin/staff/{$newStaff->id}", [
            'contact_number' => '09231234567',
        ])->assertStatus(200);
        $this->assertEquals('09231234567', $newStaff->fresh()->contact_number);
    }

    public function test_account_profile_update_validates_philippine_phone(): void
    {
        $this->actingAs($this->customer);

        // Invalid phone
        $this->patchJson('/api/v1/account/profile', [
            'name' => 'Customer Name',
            'contact_number' => '090531559600',
        ])->assertStatus(422)->assertJsonValidationErrors('contact_number');

        // Valid phone
        $this->patchJson('/api/v1/account/profile', [
            'name' => 'Customer Name',
            'contact_number' => '09991234567',
        ])->assertStatus(200);
        $this->assertEquals('09991234567', $this->customer->fresh()->contact_number);
    }

    public function test_piece_unit_stock_in_and_out_rejects_decimals(): void
    {
        $this->actingAs($this->admin);

        // Stock in decimal piece
        $this->postJson("/api/v1/admin/inventory/{$this->pieceProduct->id}/stock-in", [
            'quantity' => 1.5,
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        // Stock out decimal piece
        $this->postJson("/api/v1/admin/inventory/{$this->pieceProduct->id}/stock-out", [
            'quantity' => 2.25,
            'notes' => 'Testing decimal',
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        // Adjust decimal piece
        $this->postJson("/api/v1/admin/inventory/{$this->pieceProduct->id}/adjust", [
            'type' => 'adjustment_in',
            'quantity' => 3.75,
            'reason' => 'Testing decimal',
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        // Milliliter accepts decimals
        $this->postJson("/api/v1/admin/inventory/{$this->liquidProduct->id}/stock-in", [
            'quantity' => 25.5,
        ])->assertStatus(200);
        $this->assertEquals(525.5, (float) $this->liquidProduct->fresh()->inventory->available_quantity);
    }

    public function test_staff_inventory_rejects_decimal_piece_and_over_limit(): void
    {
        $this->actingAs($this->staff);

        // Staff stock in decimal piece
        $this->postJson("/api/v1/staff/inventory/{$this->pieceProduct->id}/stock-in", [
            'quantity' => 1.5,
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        // Staff stock in over 100,000
        $this->postJson("/api/v1/staff/inventory/{$this->pieceProduct->id}/stock-in", [
            'quantity' => 50000000,
        ])->assertStatus(422)->assertJsonValidationErrors('quantity');

        // Staff stock in valid integer
        $this->postJson("/api/v1/staff/inventory/{$this->pieceProduct->id}/stock-in", [
            'quantity' => 5,
        ])->assertStatus(200);
        $this->assertEquals(25, (int) $this->pieceProduct->fresh()->inventory->available_quantity);
    }

    public function test_product_creation_enforces_piece_integer_rules(): void
    {
        $this->actingAs($this->admin);

        // Initial quantity decimal on piece
        $this->postJson('/api/v1/admin/products', [
            'product_category_id' => $this->category->id,
            'sku' => 'PIECE-NEW',
            'name' => 'Scissors',
            'unit' => 'piece',
            'low_stock_threshold' => 2,
            'initial_quantity' => 4.5,
        ])->assertStatus(422)->assertJsonValidationErrors('initial_quantity');

        // Low stock threshold decimal on piece
        $this->postJson('/api/v1/admin/products', [
            'product_category_id' => $this->category->id,
            'sku' => 'PIECE-NEW',
            'name' => 'Scissors',
            'unit' => 'piece',
            'low_stock_threshold' => 2.5,
            'initial_quantity' => 5,
        ])->assertStatus(422)->assertJsonValidationErrors('low_stock_threshold');

        // Valid piece creation
        $res = $this->postJson('/api/v1/admin/products', [
            'product_category_id' => $this->category->id,
            'sku' => 'PIECE-NEW',
            'name' => 'Scissors',
            'unit' => 'piece',
            'low_stock_threshold' => 2,
            'initial_quantity' => 10,
        ]);
        $res->assertStatus(201);
    }

    public function test_admin_inventory_index_all_filter_and_status_filtering(): void
    {
        $this->actingAs($this->admin);

        // Create an out of stock product
        $outProduct = Product::create([
            'product_category_id' => $this->category->id,
            'sku' => 'OUT-01',
            'name' => 'Out of stock item',
            'unit' => 'piece',
            'low_stock_threshold' => 5,
            'is_active' => true,
        ]);
        $outProduct->inventory()->create(['available_quantity' => 0]);

        // Unfiltered returns all
        $resAll = $this->getJson('/api/v1/admin/inventory');
        $resAll->assertStatus(200);
        $this->assertCount(3, $resAll->json('data'));

        // Query with ?status= (empty) returns all
        $resEmptyStatus = $this->getJson('/api/v1/admin/inventory?status=');
        $resEmptyStatus->assertStatus(200);
        $this->assertCount(3, $resEmptyStatus->json('data'));

        // Query with ?status=out_of_stock returns only out of stock
        $resOut = $this->getJson('/api/v1/admin/inventory?status=out_of_stock');
        $resOut->assertStatus(200);
        $this->assertCount(1, $resOut->json('data'));
        $this->assertEquals('OUT-01', $resOut->json('data.0.sku'));
    }
}
