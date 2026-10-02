<?php

return [
    'authentication' => [
        'code_expiration_minutes' => env('POISE_AUTH_CODE_EXPIRATION_MINUTES', 15),
        'reset_authorization_minutes' => env('POISE_RESET_AUTHORIZATION_MINUTES', 10),
    ],
    'booking' => [
        'opening_time' => env('POISE_OPENING_TIME', '09:00'),
        'closing_time' => env('POISE_CLOSING_TIME', '18:00'),
        'slot_interval_minutes' => env('POISE_SLOT_INTERVAL_MINUTES', 30),
        'minimum_notice_hours' => env('POISE_MIN_NOTICE_HOURS', 2),
        'maximum_advance_days' => env('POISE_MAX_ADVANCE_DAYS', 60),
        'max_concurrent_appointments' => env('POISE_MAX_CONCURRENT_APPOINTMENTS', 0),
    ],
    'payment' => [
        'downpayment_percentage' => env('POISE_DOWNPAYMENT_PERCENTAGE', 30),
        'methods' => [
            'gcash' => [
                'enabled' => env('PAYMENT_GCASH_ENABLED', true),
                'label' => 'GCash',
                'account_name' => env('GCASH_ACCOUNT_NAME', 'Poise Hair Center'),
                'account_number' => env('GCASH_ACCOUNT_NUMBER', '09123456789'),
            ],
            'bank_transfer' => [
                'enabled' => env('PAYMENT_BANK_ENABLED', false),
                'label' => 'Bank Transfer',
                'account_name' => env('BANK_ACCOUNT_NAME', 'Poise Hair Center'),
                'account_number' => env('BANK_ACCOUNT_NUMBER', '1234567890'),
                'bank_name' => env('BANK_NAME', 'BDO'),
            ],
        ],
    ],
];
