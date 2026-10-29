<?php

namespace App\Console\Commands;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

#[Signature('petfave:create-admin {email} {--name=} {--contact=} {--address=}')]
#[Description('Create a PetFave administrator; prompts securely for a password')]
class CreateAdmin extends Command
{
    public function handle(): int
    {
        $data = [
            'email' => strtolower($this->argument('email')),
            'name' => $this->option('name') ?: $this->ask('Full name'),
            'contact_number' => $this->option('contact') ?: $this->ask('Contact number'),
            'address' => $this->option('address') ?: $this->ask('Address'),
            'password' => $this->secret('Password (at least 12 characters)'),
        ];
        $validator = Validator::make($data, [
            'email' => ['required', 'email', 'max:255', 'unique:users'],
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:2000'],
            'password' => ['required', Password::min(12)],
        ]);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        DB::transaction(function () use ($data): void {
            $user = new User;
            $user->forceFill([...$data, 'role' => 'admin', 'approval_status' => 'approved'])->save();
            ActivityLog::record('Administrator created from console', $user);
        });
        $this->info('Administrator created. Sign in using the React application.');

        return self::SUCCESS;
    }
}
