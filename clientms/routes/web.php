<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('api/auth')->middleware('throttle:10,1')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('guest');
    Route::post('register', [AuthController::class, 'register'])->middleware('guest');
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

Route::get('auth/google/redirect', [GoogleAuthController::class, 'redirect'])->middleware('throttle:10,1');
Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->middleware('throttle:10,1')->name('google.callback');
