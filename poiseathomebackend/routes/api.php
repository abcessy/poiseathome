<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AdminStaffController;
use App\Http\Controllers\StaffProfileController;
use App\Http\Controllers\StaffDayOffController;
use App\Http\Controllers\CustomerPaymentController;
use App\Http\Controllers\AdminPaymentController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\StaffInventoryController;
use App\Http\Controllers\AppointmentProductUsageController;
use App\Http\Controllers\CustomerAddressController;
use App\Http\Controllers\AccountProfileController;
use App\Http\Controllers\CustomerReviewController;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        $dbConnected = false;
        try {
            DB::connection()->getPdo();
            $dbConnected = true;
        } catch (\Exception $e) {
            $dbConnected = false;
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'status' => 'ok',
                'system' => 'PoiseAtHome API',
                'database' => [
                    'connected' => $dbConnected
                ]
            ]
        ]);
    });

    // Public Auth Routes
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/verify-email', [AuthController::class, 'verifyEmail'])->middleware('throttle:10,15');
        Route::post('/resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:5,15');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,15');
        Route::post('/forgot-password/verify', [AuthController::class, 'verifyPasswordResetCode'])->middleware('throttle:10,15');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:5,15');
    });

    // Public Catalog
    Route::get('/service-categories', [\App\Http\Controllers\ServiceCategoryController::class, 'publicIndex']);
    Route::get('/services', [\App\Http\Controllers\ServiceController::class, 'publicIndex']);
    Route::get('/services/{slug}', [\App\Http\Controllers\ServiceController::class, 'publicShow']);
    Route::get('/reviews', [CustomerReviewController::class, 'index']);

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::patch('/account/profile', [AccountProfileController::class, 'update']);
        Route::patch('/account/password', [AccountProfileController::class, 'updatePassword']);
        Route::post('/account/avatar', [AccountProfileController::class, 'uploadAvatar']);

        // Notifications
        Route::get('/notifications', [\App\Http\Controllers\NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [\App\Http\Controllers\NotificationController::class, 'unreadCount']);
        Route::patch('/notifications/read-all', [\App\Http\Controllers\NotificationController::class, 'markAllRead']);
        Route::patch('/notifications/{notification}/read', [\App\Http\Controllers\NotificationController::class, 'markRead']);

        // Admin Routes
        Route::middleware('role:admin')->prefix('admin')->group(function () {
            // Reports
            Route::get('/reports/overview', [\App\Http\Controllers\AdminReportController::class, 'overview']);
            Route::get('/reports/appointments', [\App\Http\Controllers\AdminReportController::class, 'appointments']);
            Route::get('/reports/completed-services', [\App\Http\Controllers\AdminReportController::class, 'completedServices']);
            Route::get('/reports/service-performance', [\App\Http\Controllers\AdminReportController::class, 'servicePerformance']);
            Route::get('/reports/staff-performance', [\App\Http\Controllers\AdminReportController::class, 'staffPerformance']);
            Route::get('/reports/product-usage', [\App\Http\Controllers\AdminReportController::class, 'productUsage']);
            Route::get('/reports/payments', [\App\Http\Controllers\AdminReportController::class, 'payments']);
            Route::get('/reports/inventory', [\App\Http\Controllers\AdminReportController::class, 'inventory']);
            Route::get('/reports/stock-movements', [\App\Http\Controllers\AdminReportController::class, 'stockMovements']);

            // Staff Mgmt
            Route::get('/users', [AdminStaffController::class, 'getUsers']);
            Route::patch('/users/{user}/active', [AdminStaffController::class, 'toggleActive']);
            
            Route::get('/staff', [AdminStaffController::class, 'index']);
            Route::post('/staff', [AdminStaffController::class, 'store']);
            Route::get('/staff/{staff}', [AdminStaffController::class, 'show']);
            Route::put('/staff/{staff}', [AdminStaffController::class, 'update']);
            
            Route::get('/staff/{staff}/days-off', [StaffDayOffController::class, 'adminIndex']);
            Route::post('/staff/{staff}/days-off', [StaffDayOffController::class, 'adminStore']);
            Route::delete('/staff/{staff}/days-off/{dayOff}', [StaffDayOffController::class, 'adminDestroy']);

            // Catalog Mgmt
            Route::apiResource('service-categories', \App\Http\Controllers\ServiceCategoryController::class);
            Route::patch('service-categories/{service_category}/active', [\App\Http\Controllers\ServiceCategoryController::class, 'toggleActive']);

            Route::apiResource('services', \App\Http\Controllers\ServiceController::class);
            Route::patch('services/{service}/active', [\App\Http\Controllers\ServiceController::class, 'toggleActive']);
            
            Route::get('services/{service}/staff', [\App\Http\Controllers\StaffServiceController::class, 'getStaffForService']);
            Route::put('services/{service}/staff', [\App\Http\Controllers\StaffServiceController::class, 'updateStaffForService']);

            // Admin Appointments
            Route::get('/appointments', [\App\Http\Controllers\AdminAppointmentController::class, 'index']);
            Route::get('/appointments/{appointment}', [\App\Http\Controllers\AdminAppointmentController::class, 'show']);
            Route::patch('/appointments/{appointment}/status', [\App\Http\Controllers\AdminAppointmentController::class, 'updateStatus']);
            Route::patch('/appointments/{appointment}/staff', [\App\Http\Controllers\AdminAppointmentController::class, 'reassignStaff']);
            Route::patch('/appointments/{appointment}/reschedule', [\App\Http\Controllers\AdminAppointmentController::class, 'reschedule']);
            Route::match(['patch', 'post'], '/appointments/{appointment}/cancel', [\App\Http\Controllers\AdminAppointmentController::class, 'cancel']);
            Route::post('/appointments/{appointment}/extend-time', [\App\Http\Controllers\AdminAppointmentController::class, 'extendTime']);
            Route::get('/appointments/{appointment}/product-usages', [AppointmentProductUsageController::class, 'index']);
            Route::post('/appointments/{appointment}/product-usages/{usage}/reverse', [AppointmentProductUsageController::class, 'reverse']);

            // Admin Payments
            Route::get('/payments', [AdminPaymentController::class, 'index']);
            Route::get('/payments/{payment}', [AdminPaymentController::class, 'show']);
            Route::get('/payments/{payment}/proof', [AdminPaymentController::class, 'getProof']);
            Route::patch('/payments/{payment}/approve', [AdminPaymentController::class, 'approve']);
            Route::patch('/payments/{payment}/reject', [AdminPaymentController::class, 'reject']);
            
            // Phase 6: Product & Inventory
            Route::apiResource('product-categories', ProductCategoryController::class);
            Route::apiResource('products', ProductController::class)->except('destroy');
            Route::patch('/products/{product}/archive', [ProductController::class, 'archive']);
            Route::patch('/products/{product}/restore', [ProductController::class, 'restore']);
            
            Route::get('/inventory', [InventoryController::class, 'index']);
            Route::post('/inventory/{product}/stock-in', [InventoryController::class, 'stockIn']);
            Route::post('/inventory/{product}/stock-out', [InventoryController::class, 'stockOut']);
            Route::post('/inventory/{product}/adjust', [InventoryController::class, 'adjust']);
            Route::get('/inventory/{product}/movements', [InventoryController::class, 'movements']);
        });

        // Staff Routes
        Route::middleware('role:staff')->prefix('staff')->group(function () {
            Route::get('/reports/overview', [\App\Http\Controllers\StaffReportController::class, 'overview']);
            Route::get('/reports/product-usage', [\App\Http\Controllers\StaffReportController::class, 'productUsage']);
            
            Route::get('/profile', [StaffProfileController::class, 'show']);
            Route::post('/profile', [StaffProfileController::class, 'update']);
            Route::put('/availability', [StaffProfileController::class, 'updateAvailability']);

            Route::get('/days-off', [StaffDayOffController::class, 'index']);
            Route::post('/days-off', [StaffDayOffController::class, 'store']);
            Route::delete('/days-off/{dayOff}', [StaffDayOffController::class, 'destroy']);

            // Services
            Route::get('/services', [\App\Http\Controllers\StaffServiceController::class, 'myServices']);

            // Staff Appointments
            Route::get('/appointments', [\App\Http\Controllers\StaffAppointmentController::class, 'index']);
            Route::get('/appointments/{appointment}', [\App\Http\Controllers\StaffAppointmentController::class, 'show']);
            Route::patch('/appointments/{appointment}/status', [\App\Http\Controllers\StaffAppointmentController::class, 'updateStatus']);
            Route::match(['patch', 'post'], '/appointments/{appointment}/cancel', [\App\Http\Controllers\StaffAppointmentController::class, 'cancel']);
            Route::post('/appointments/{appointment}/extend-time', [\App\Http\Controllers\StaffAppointmentController::class, 'extendTime']);
            
            // Phase 6: Staff Inventory & Usage
            Route::get('/inventory', [StaffInventoryController::class, 'index']);
            Route::get('/inventory/{product}', [StaffInventoryController::class, 'show']);
            Route::post('/inventory/{product}/stock-in', [StaffInventoryController::class, 'stockIn']);
            Route::post('/inventory/{product}/stock-out', [StaffInventoryController::class, 'stockOut']);
            Route::post('/inventory/{product}/adjust', [StaffInventoryController::class, 'adjust']);
            Route::get('/inventory/{product}/movements', [StaffInventoryController::class, 'movements']);
            Route::get('/appointments/{appointment}/product-usages', [AppointmentProductUsageController::class, 'index']);
            Route::post('/appointments/{appointment}/product-usages', [AppointmentProductUsageController::class, 'store']);
            Route::post('/appointments/{appointment}/product-usages/{usage}/reverse', [AppointmentProductUsageController::class, 'reverse']);
        });

        // Customer Booking & Appointments
        Route::middleware('role:customer')->group(function () {
            Route::get('/customer/review', [CustomerReviewController::class, 'customerContext']);
            Route::put('/customer/review', [CustomerReviewController::class, 'upsert']);
            Route::post('/customer/appointments/{appointment}/review', [CustomerReviewController::class, 'rateAppointment']);
            Route::get('/customer/address', [CustomerAddressController::class, 'show']);
            Route::put('/customer/address', [CustomerAddressController::class, 'update']);
            Route::delete('/customer/address', [CustomerAddressController::class, 'destroy']);

            // Booking API
            Route::get('/booking/services/{service}/staff', [\App\Http\Controllers\BookingController::class, 'getStaffForService']);
            Route::get('/booking/availability', [\App\Http\Controllers\BookingController::class, 'getAvailability']);
            Route::post('/appointments', [\App\Http\Controllers\BookingController::class, 'store']);

            // Customer Appointments
            Route::get('/customer/appointments', [\App\Http\Controllers\CustomerAppointmentController::class, 'index']);
            Route::get('/customer/appointments/{appointment}', [\App\Http\Controllers\CustomerAppointmentController::class, 'show']);
            Route::patch('/customer/appointments/{appointment}/reschedule', [\App\Http\Controllers\CustomerAppointmentController::class, 'reschedule']);
            Route::post('/customer/appointments/{appointment}/cancel', [\App\Http\Controllers\CustomerAppointmentController::class, 'cancel']);

            // Customer Payments
            Route::get('/customer/payment-methods', [CustomerPaymentController::class, 'methods']);
            Route::get('/customer/appointments/{appointment}/payments', [CustomerPaymentController::class, 'index']);
            Route::post('/customer/appointments/{appointment}/payments', [CustomerPaymentController::class, 'store']);
            Route::get('/customer/payments/{payment}/proof', [CustomerPaymentController::class, 'getProof']);
        });
    });
});
