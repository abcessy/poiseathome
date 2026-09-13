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
        $reviews = (clone $query)->with(['customer:id,name,avatar_path', 'staff:id,name', 'appointment'])
            ->latest()->limit(60)->get()->map(fn (CustomerReview $review) => [
                'id' => $review->id,
                'customer_name' => $review->customer?->name,
                'customer_avatar_path' => $review->customer?->avatar_path,
                'staff_name' => $review->staff?->name,
                'rating' => $review->rating,
                'stylist_rating' => $review->stylist_rating,
                'shop_rating' => $review->shop_rating,
                'service_name' => $review->appointment?->service_name_snapshot,
                'comment' => $review->comment,
                'created_at' => $review->created_at,
            ]);

        $avgOverall = round((float) (clone $query)->avg('rating'), 1);
        $avgStylist = round((float) (clone $query)->whereNotNull('stylist_rating')->avg('stylist_rating'), 1);
        $avgShop = round((float) (clone $query)->whereNotNull('shop_rating')->avg('shop_rating'), 1);

        return response()->json(['status' => 'success', 'data' => [
            'reviews' => $reviews,
            'summary' => [
                'average' => $avgOverall ?: 5.0,
                'stylist_average' => $avgStylist ?: $avgOverall ?: 5.0,
                'shop_average' => $avgShop ?: $avgOverall ?: 5.0,
                'average_stylist' => $avgStylist ?: $avgOverall ?: 5.0,
                'average_shop' => $avgShop ?: $avgOverall ?: 5.0,
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

        $completedAppointments = Appointment::where('customer_id', $request->user()->id)
            ->where('status', 'completed')
            ->with(['staff.profile', 'review'])
            ->orderBy('completed_at', 'desc')
            ->get()
            ->map(fn ($app) => [
                'id' => $app->id,
                'appointment_number' => $app->appointment_number,
                'service_name' => $app->service_name_snapshot,
                'completed_at' => $app->completed_at,
                'staff' => [
                    'id' => $app->staff?->id,
                    'name' => $app->staff?->profile?->display_name ?: $app->staff?->name,
                ],
                'review' => $app->review,
            ]);

        return response()->json(['status' => 'success', 'data' => [
            'review' => CustomerReview::where('customer_id', $request->user()->id)->latest()->first(),
            'staff' => $staff,
            'completed_appointments' => $completedAppointments,
        ]]);
    }

    public function upsert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stylist_rating' => ['nullable', 'integer', 'between:1,5'],
            'shop_rating' => ['nullable', 'integer', 'between:1,5'],
            'rating' => ['nullable', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1500'],
            'staff_user_id' => ['nullable', 'integer'],
            'appointment_id' => ['nullable', 'integer', 'exists:appointments,id'],
        ]);

        $stylistRating = $validated['stylist_rating'] ?? null;
        $shopRating = $validated['shop_rating'] ?? null;
        $overallRating = $validated['rating'] ?? null;

        if (!$overallRating) {
            if ($stylistRating && $shopRating) {
                $overallRating = (int) round(($stylistRating + $shopRating) / 2);
            } elseif ($stylistRating) {
                $overallRating = $stylistRating;
            } elseif ($shopRating) {
                $overallRating = $shopRating;
            } else {
                throw ValidationException::withMessages(['rating' => 'Please provide a rating.']);
            }
        }

        $appointmentId = $validated['appointment_id'] ?? null;
        $staffUserId = $validated['staff_user_id'] ?? null;

        if ($appointmentId) {
            $appointment = Appointment::where('id', $appointmentId)
                ->where('customer_id', $request->user()->id)
                ->firstOrFail();

            if ($appointment->status !== 'completed') {
                throw ValidationException::withMessages(['appointment_id' => 'Only completed appointments can be reviewed.']);
            }

            $staffUserId = $appointment->staff_user_id;

            $review = CustomerReview::updateOrCreate(
                [
                    'customer_id' => $request->user()->id,
                    'appointment_id' => $appointment->id,
                ],
                [
                    'staff_user_id' => $staffUserId,
                    'stylist_rating' => $stylistRating,
                    'shop_rating' => $shopRating,
                    'rating' => $overallRating,
                    'comment' => $validated['comment'] ?? null,
                ]
            );
        } else {
            if (! empty($staffUserId) && ! $this->eligibleStaff($request)->contains('id', (int) $staffUserId)) {
                throw ValidationException::withMessages(['staff_user_id' => 'Choose a hairstylist who completed one of your appointments.']);
            }

            $review = CustomerReview::updateOrCreate(
                [
                    'customer_id' => $request->user()->id,
                    'appointment_id' => null,
                ],
                [
                    'staff_user_id' => $staffUserId,
                    'stylist_rating' => $stylistRating,
                    'shop_rating' => $shopRating,
                    'rating' => $overallRating,
                    'comment' => $validated['comment'] ?? null,
                ]
            );
        }

        return response()->json(['status' => 'success', 'message' => 'Thank you for sharing your experience.', 'data' => $review]);
    }

    public function rateAppointment(Request $request, Appointment $appointment): JsonResponse
    {
        if ($appointment->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($appointment->status !== 'completed') {
            return response()->json(['message' => 'Only completed services can be rated.'], 400);
        }

        $validated = $request->validate([
            'stylist_rating' => ['required', 'integer', 'between:1,5'],
            'shop_rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1500'],
        ]);

        $overallRating = (int) round(($validated['stylist_rating'] + $validated['shop_rating']) / 2);

        $review = CustomerReview::updateOrCreate(
            [
                'customer_id' => $request->user()->id,
                'appointment_id' => $appointment->id,
            ],
            [
                'staff_user_id' => $appointment->staff_user_id,
                'stylist_rating' => $validated['stylist_rating'],
                'shop_rating' => $validated['shop_rating'],
                'rating' => $overallRating,
                'comment' => $validated['comment'] ?? null,
            ]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Thank you for rating your service and stylist!',
            'data' => $review,
        ]);
    }

    private function eligibleStaff(Request $request)
    {
        $ids = Appointment::where('customer_id', $request->user()->id)
            ->where('status', 'completed')->whereNotNull('staff_user_id')->distinct()->pluck('staff_user_id');

        return \App\Models\User::whereIn('id', $ids)->with('profile')->orderBy('name')->get();
    }
}
