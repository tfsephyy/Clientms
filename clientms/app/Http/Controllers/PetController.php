<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Client;
use App\Models\Pet;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PetController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $query = Pet::with('client:id,name')->withCount('visits');
        if ($request->user()->role === 'owner') {
            $query->whereHas('client', fn ($query) => $query->where('user_id', $request->user()->id));
        }
        if (! $request->boolean('archived')) {
            $query->whereNull('archived_at')->whereHas('client', fn ($query) => $query->whereNull('archived_at'));
        }
        if ($request->filled('client_id')) {
            $query->where('client_id', $request->integer('client_id'));
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('species', 'like', '%'.$search.'%'));
        }

        return $query->orderBy('name')->paginate(20);
    }

    public function show(Request $request, Pet $pet): Pet
    {
        Gate::authorize('view', $pet);
        $pet->load(['client:id,name', 'visits' => fn ($query) => $query->with('recorder:id,name')->latest('visited_at')]);
        if ($request->user()->role === 'admin') {
            $pet->load('ownerships.client:id,name');
        }

        return $pet;
    }

    public function store(Request $request): Pet
    {
        $data = $this->validated($request);
        if ($request->user()->role === 'owner') {
            $request->validate(['client_id' => ['prohibited']]);
            $client = $request->user()->client;
        } else {
            $request->validate(['client_id' => ['required', 'integer', 'exists:clients,id']]);
            $client = Client::findOrFail($request->integer('client_id'));
        }
        abort_unless($client && ! $client->archived_at, 422, 'Choose an active client.');

        return DB::transaction(function () use ($client, $data): Pet {
            $pet = $client->pets()->create($data);
            $pet->ownerships()->create(['client_id' => $client->id, 'started_at' => now()]);
            ActivityLog::record('Pet registered', $pet);

            return $pet;
        });
    }

    public function update(Request $request, Pet $pet): Pet
    {
        Gate::authorize('view', $pet);
        $request->validate(['client_id' => ['prohibited']]);
        $data = $this->validated($request);

        return DB::transaction(function () use ($pet, $data): Pet {
            $pet->update($data);
            ActivityLog::record('Pet updated', $pet);

            return $pet;
        });
    }

    public function archive(Pet $pet): Pet
    {
        Gate::authorize('view', $pet);

        return DB::transaction(function () use ($pet): Pet {
            $pet->archived_at = now();
            $pet->save();
            ActivityLog::record('Pet archived', $pet);

            return $pet;
        });
    }

    public function transfer(Request $request, Pet $pet): Pet
    {
        $request->validate(['client_id' => ['required', 'integer', 'exists:clients,id']]);

        return DB::transaction(function () use ($pet, $request): Pet {
            return $this->changeOwner($pet, $request->integer('client_id'));
        });
    }

    public function changeOwner(Pet $pet, int $clientId): Pet
    {
        $pet = Pet::lockForUpdate()->findOrFail($pet->id);
        $client = Client::lockForUpdate()->findOrFail($clientId);
        abort_if($client->archived_at, 422, 'Choose an active client.');
        abort_if($pet->client_id === $client->id, 422, 'This client already owns the pet.');
        $pet->ownerships()->whereNull('ended_at')->update(['ended_at' => now()]);
        $pet->ownerships()->create(['client_id' => $client->id, 'started_at' => now()]);
        $pet->client_id = $client->id;
        $pet->save();
        ActivityLog::record('Pet ownership transferred', $pet);

        return $pet;
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'species' => ['required', 'string', 'max:80'],
            'breed' => ['nullable', 'string', 'max:120'],
            'sex' => ['required', Rule::in(['male', 'female', 'unknown'])],
            'birth_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'color' => ['nullable', 'string', 'max:120'],
        ]);
    }
}
