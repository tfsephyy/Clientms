<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'role' => $this->role,
            'approval_status' => $this->approval_status,
            'profile_complete' => $this->resource->profileComplete(),
            'client_id' => $this->client?->id,
            'archived' => (bool) $this->client?->archived_at,
            'created_at' => $this->created_at,
        ];
    }
}
