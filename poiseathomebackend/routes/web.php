<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/up', function () {
    return response()->json([
        'status' => 'up',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::get('/robots.txt', function () {
    return response("User-agent: *\nDisallow:\n", 200, ['Content-Type' => 'text/plain']);
});
