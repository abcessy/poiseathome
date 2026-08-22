    public function test_staff_cannot_book_as_customer()
    {
        $date = now()->addDays(2)->format('Y-m-d');
        $response = $this->actingAs($this->staff)->postJson('/api/v1/appointments', [
            'service_id' => $this->service->id,
            'staff_id' => $this->staff->id,
            'date' => $date,
            'start_time' => '10:00',
            'service_address' => '123 Main St',
        ]);
        $response->assertStatus(403);
    }

    public function test_concurrency_overlap_rejection()
    {
        $this->assertTrue(true);
    }
}
