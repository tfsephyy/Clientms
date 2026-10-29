<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Client;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ClientController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $query = Client::query()->withCount('pets');
        if ($request->user()->role === 'owner') {
            $query->where('user_id', $request->user()->id);
        }
        if (! $request->boolean('archived')) {
            $query->whereNull('archived_at');
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(function ($query) use ($search): void {
                $query->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%')->orWhere('contact_number', 'like', '%'.$search.'%')->orWhere('address', 'like', '%'.$search.'%');
            });
        }

        return $query->orderBy('name')->paginate(20);
    }

    public function show(Client $client): Client
    {
        Gate::authorize('view', $client);

        return $client->load('pets');
    }

    public function store(Request $request): Client
    {
        $data = $this->validated($request);

        return DB::transaction(function () use ($data): Client {
            $client = Client::create($data);
            ActivityLog::record('Client registered', $client);

            return $client;
        });
    }

    public function update(Request $request, Client $client): Client
    {
        $data = $this->validated($request);

        return DB::transaction(function () use ($client, $data): Client {
            $client->update($data);
            if ($client->user) {
                $client->user->forceFill(collect($data)->except('email')->all())->save();
            }
            ActivityLog::record('Client updated', $client);

            return $client;
        });
    }

    public function archive(Client $client): Client
    {
        return DB::transaction(function () use ($client): Client {
            $client->archived_at = now();
            $client->save();
            ActivityLog::record('Client archived', $client);

            return $client;
        });
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:2000'],
            'user_id' => ['prohibited'],
        ]);
    }
}
