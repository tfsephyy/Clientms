<?php

namespace Database\Factories;

use App\Models\Pet;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Visit>
 */
class VisitFactory extends Factory
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
            'recorded_by' => User::factory()->state(['role' => 'staff']),
            'visited_at' => now()->subDay(),
            'purpose' => 'Clinic visit',
            'notes' => 'Client arrived at the front desk.',
        ];
    }
}
