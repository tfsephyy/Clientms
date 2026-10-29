<?php

namespace App\Providers;

use App\Models\Client;
use App\Models\Pet;
use App\Models\Visit;
use App\Policies\RecordPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        foreach ([Client::class, Pet::class, Visit::class] as $model) {
            Gate::policy($model, RecordPolicy::class);
        }
    }
}
