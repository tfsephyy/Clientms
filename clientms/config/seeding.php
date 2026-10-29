<?php

return [
    'admin' => [
        'name' => env('ADMIN_NAME', 'PetFave Administrator'),
        'email' => env('ADMIN_EMAIL', 'admin@petfave.test'),
        'password' => env('ADMIN_PASSWORD'),
        'contact_number' => env('ADMIN_CONTACT_NUMBER', '09170000001'),
        'address' => env('ADMIN_ADDRESS', 'PetFave Clinic, Manila, Philippines'),
    ],
    'demo' => [
        'enabled' => (bool) env('SEED_DEMO_DATA', false),
        'password' => env('DEMO_PASSWORD'),
    ],
];
