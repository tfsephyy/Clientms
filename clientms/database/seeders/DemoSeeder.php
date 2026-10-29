<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\CorrectionRequest;
use App\Models\Pet;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Demo records may only be seeded in local or testing environments.');
        }

        $password = config('seeding.demo.password');
        Validator::make(['password' => $password], ['password' => ['required', Password::min(12)]])->validate();

        DB::transaction(function () use ($password): void {
            $staff = $this->account('staff.demo@petfave.test', 'Demo Clinic Staff', 'staff', 'approved', $password);
            $this->account('pending.demo@petfave.test', 'Demo Staff Applicant', 'staff', 'pending', $password);
            $owner = $this->account('owner.demo@petfave.test', 'Demo Pet Owner', 'owner', 'approved', $password);
            $client = $owner->client()->firstOrCreate([], $owner->only(['name', 'email', 'contact_number', 'address']));
            $walkIn = Client::firstOrCreate(['email' => 'walkin.demo@petfave.test'], [
                'name' => 'Demo Walk-in Client',
                'contact_number' => '09170000005',
                'address' => 'Sample address, Quezon City, Philippines',
            ]);

            $milo = $this->pet($client, 'Milo', 'Cat', 'Domestic Shorthair', 'male', 'Orange tabby');
            $luna = $this->pet($client, 'Luna', 'Dog', 'Aspin', 'female', 'White and tan');
            $buddy = $this->pet($walkIn, 'Buddy', 'Dog', 'Labrador Retriever', 'male', 'Golden');

            $visit = $this->visit($milo, $staff, 'Initial client registration', 'Sample visit: owner contact information and pet registration confirmed.', 7);
            $this->visit($luna, $staff, 'Owner contact update', 'Sample visit: owner confirmed the contact number on file.', 3);
            $this->visit($buddy, $staff, 'Clinic check-in', 'Sample visit: walk-in owner registered at the front desk.', 1);

            $correction = CorrectionRequest::firstOrCreate([
                'user_id' => $owner->id,
                'pet_id' => $milo->id,
                'visit_id' => $visit->id,
                'type' => 'visit',
            ], [
                'description' => 'Sample request: please verify the check-in date for this registration visit.',
                'status' => 'pending',
            ]);
            if ($correction->wasRecentlyCreated) {
                ActivityLog::record('Demo correction request seeded', $correction);
            }
        });

        $this->command?->info('Local demo accounts, clients, pets, ownerships, visits, and a correction request are ready.');
    }

    private function account(string $email, string $name, string $role, string $status, string $password): User
    {
        $user = User::where('email', $email)->first();
        if ($user) {
            if ($user->role !== $role || $user->name !== $name) {
                throw new RuntimeException('Demo account email '.$email.' is already in use by another account.');
            }

            return $user;
        }

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => $password,
            'role' => $role,
            'approval_status' => $status,
            'contact_number' => '09170000002',
            'address' => 'Sample address, Manila, Philippines',
            'email_verified_at' => now(),
        ])->save();
        ActivityLog::record('Demo account seeded', $user);

        return $user;
    }

    private function pet(Client $client, string $name, string $species, string $breed, string $sex, string $color): Pet
    {
        $pet = $client->pets()->firstOrCreate(['name' => $name], [
            'species' => $species,
            'breed' => $breed,
            'sex' => $sex,
            'color' => $color,
            'birth_date' => '2023-06-15',
        ]);
        if ($pet->wasRecentlyCreated) {
            $pet->ownerships()->create(['client_id' => $client->id, 'started_at' => now()->subYear()]);
            ActivityLog::record('Demo pet seeded', $pet);
        }

        return $pet;
    }

    private function visit(Pet $pet, User $staff, string $purpose, string $notes, int $daysAgo): Visit
    {
        $visit = $pet->visits()->firstOrCreate(['purpose' => $purpose], [
            'recorded_by' => $staff->id,
            'visited_at' => now()->subDays($daysAgo)->startOfHour(),
            'notes' => $notes,
        ]);
        if ($visit->wasRecentlyCreated) {
            ActivityLog::record('Demo visit seeded', $visit);
        }

        return $visit;
    }
}
