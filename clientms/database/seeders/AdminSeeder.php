<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $data = config('seeding.admin');
        $data['email'] = strtolower(trim($data['email'] ?? ''));

        DB::transaction(function () use ($data): void {
            $existing = User::where('email', $data['email'])->first();
            if ($existing) {
                if ($existing->role !== 'admin') {
                    throw new RuntimeException('ADMIN_EMAIL belongs to an existing non-administrator. Choose a different email; seeding will not change that account.');
                }

                $this->command?->info('Administrator already exists; account and password preserved.');

                return;
            }

            Validator::make($data, [
                'name' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255'],
                'password' => ['required', Password::min(12)],
                'contact_number' => ['required', 'string', 'max:30'],
                'address' => ['required', 'string', 'max:2000'],
            ])->validate();

            $admin = new User;
            $admin->forceFill([
                ...$data,
                'role' => 'admin',
                'approval_status' => 'approved',
                'email_verified_at' => now(),
            ])->save();
            ActivityLog::record('Administrator seeded', $admin);
            $this->command?->info('Administrator created: '.$admin->email);
        });
    }
}
