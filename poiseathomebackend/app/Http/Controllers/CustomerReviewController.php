<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\CustomerReview;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CustomerReviewController extends Controller
{
    public function index(): JsonResponse
    {
        $query = CustomerReview::query();
        $reviews = (clone $query)->with(['customer:id,name,avatar_path', 'staff:id,name'])
            ->latest()->limit(60)->get()->map(fn (CustomerReview $review) => [
                'id' => $review->id,
                'customer_name' => $review->customer?->name,
                'customer_avatar_path' => $review->customer?->avatar_path,
                'staff_name' => $review->staff?->name,
                'rating' => $review->rating,
                'comment' => $review->comment,
                'created_at' => $review->created_at,
            ]);

        return response()->json(['status' => 'success', 'data' => [
            'reviews' => $reviews,
            'summary' => [
                'average' => round((float) (clone $query)->avg('rating'), 1),
                'count' => (clone $query)->count(),
            ],
        ]]);
    }

    public function customerContext(Request $request): JsonResponse
    {
        $staff = $this->eligibleStaff($request)->map(fn ($user) => [
            'id' => $user->id,
            'name' => $user->profile?->display_name ?: $user->name,
            'specialization' => $user->profile?->specialization,
        ]);

        return response()->json(['status' => 'success', 'data' => [
            'review' => CustomerReview::where('customer_id', $request->user()->id)->first(),
            'staff' => $staff,
        ]]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1500'],
            'staff_user_id' => ['nullable', 'integer'],
        ]);

        if (! empty($validated['staff_user_id']) && ! $this->eligibleStaff($request)->contains('id', (int) $validated['staff_user_id'])) {
            throw ValidationException::withMessages(['staff_user_id' => 'Choose a hairstylist who completed one of your appointments.']);
        }

        $review = CustomerReview::updateOrCreate(
            ['customer_id' => $request->user()->id],
            [
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
                'staff_user_id' => $validated['staff_user_id'] ?? null,
            ],
        );

        return response()->json(['status' => 'success', 'message' => 'Thank you for sharing your experience.', 'data' => $review]);
    }

    private function eligibleStaff(Request $request)
    {
        $ids = Appointment::where('customer_id', $request->user()->id)
            ->where('status', 'completed')->whereNotNull('staff_user_id')->distinct()->pluck('staff_user_id');

        return \App\Models\User::whereIn('id', $ids)->with('profile')->orderBy('name')->get();
    }
}
