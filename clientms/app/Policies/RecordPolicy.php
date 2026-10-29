<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\Pet;
use App\Models\User;
use App\Models\Visit;

class RecordPolicy
{
    public function view(User $user, Client|Pet|Visit $record): bool
    {
        if (in_array($user->role, ['admin', 'staff'], true)) {
            return true;
        }

        $client = match (true) {
            $record instanceof Client => $record,
            $record instanceof Pet => $record->client,
            default => $record->pet->client,
        };

        return $user->role === 'owner' && $client->user_id === $user->id;
    }
}
