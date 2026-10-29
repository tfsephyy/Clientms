<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'auth/google/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_filter(explode(',', env('FRONTEND_URL', 'http://localhost:5173'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Accept', 'X-Requested-With', 'X-XSRF-TOKEN'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
