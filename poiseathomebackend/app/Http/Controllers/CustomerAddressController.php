<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerAddressController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => ['address' => $request->user()->address],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['required', 'string', 'max:500'],
        ]);

        $request->user()->update(['address' => $validated['address']]);

        return response()->json([
            'status' => 'success',
            'message' => 'Address saved successfully.',
            'data' => ['address' => $request->user()->address],
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->update(['address' => null]);

        return response()->json([
            'status' => 'success',
            'message' => 'Address removed successfully.',
        ]);
    }
}
