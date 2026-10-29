<?php

namespace Database\Factories;

use App\Models\Client;
use App\Models\Ownership;
use App\Models\Pet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Ownership>
 */
class OwnershipFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'pet_id' => Pet::factory(),
            'client_id' => Client::factory(),
            'started_at' => now(),
        ];
    }
}
