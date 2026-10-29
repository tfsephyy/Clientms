<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\CorrectionController;
use App\Http\Controllers\PetController;
use App\Http\Controllers\VisitController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'throttle:120,1'])->prefix('v1')->group(function () {
    Route::get('me', [AuthController::class, 'me']);
    Route::put('profile', [AuthController::class, 'profile']);

    Route::middleware(['ready', 'role:admin,staff,owner'])->group(function () {
        Route::get('clients', [ClientController::class, 'index']);
        Route::get('clients/{client}', [ClientController::class, 'show']);
        Route::get('pets', [PetController::class, 'index']);
        Route::get('pets/{pet}', [PetController::class, 'show']);
        Route::get('visits', [VisitController::class, 'index']);
        Route::get('visits/{visit}', [VisitController::class, 'show']);

        Route::middleware('role:admin,owner')->group(function () {
            Route::post('pets', [PetController::class, 'store']);
            Route::put('pets/{pet}', [PetController::class, 'update']);
            Route::delete('pets/{pet}', [PetController::class, 'archive']);
        });

        Route::middleware('role:admin,staff')->group(function () {
            Route::post('visits', [VisitController::class, 'store']);
            Route::put('visits/{visit}', [VisitController::class, 'update']);
        });

        Route::middleware('role:admin,owner')->group(function () {
            Route::get('corrections', [CorrectionController::class, 'index']);
            Route::get('corrections/{correction}', [CorrectionController::class, 'show']);
        });
        Route::post('corrections', [CorrectionController::class, 'store'])->middleware('role:owner');

        Route::middleware('role:admin')->group(function () {
            Route::post('clients', [ClientController::class, 'store']);
            Route::put('clients/{client}', [ClientController::class, 'update']);
            Route::delete('clients/{client}', [ClientController::class, 'archive']);
            Route::post('pets/{pet}/ownership', [PetController::class, 'transfer']);
            Route::put('corrections/{correction}/resolve', [CorrectionController::class, 'resolve']);
            Route::get('users', [AdminController::class, 'users']);
            Route::put('users/{user}', [AdminController::class, 'updateUser']);
            Route::get('activity', [AdminController::class, 'activity']);
        });
    });
});
