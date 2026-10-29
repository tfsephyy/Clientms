<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Pet;
use App\Models\Visit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class VisitController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $query = Visit::with(['pet:id,name,client_id', 'pet.client:id,name', 'recorder:id,name']);
        if ($request->user()->role === 'owner') {
            $query->whereHas('pet.client', fn ($query) => $query->where('user_id', $request->user()->id));
        }
        if ($request->filled('pet_id')) {
            $query->where('pet_id', $request->integer('pet_id'));
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($query) => $query->where('purpose', 'like', '%'.$search.'%')->orWhereHas('pet', fn ($query) => $query->where('name', 'like', '%'.$search.'%')));
        }

        return $query->latest('visited_at')->paginate(20);
    }

    public function show(Visit $visit): Visit
    {
        Gate::authorize('view', $visit);

        return $visit->load(['pet:id,name,client_id', 'recorder:id,name']);
    }

    public function store(Request $request): Visit
    {
        $request->validate(['pet_id' => ['required', 'integer', 'exists:pets,id']]);
        $data = $this->validated($request);
        $pet = Pet::findOrFail($request->integer('pet_id'));
        abort_if($pet->archived_at || $pet->client->archived_at, 422, 'Visits can only be added for active pets and clients.');

        return DB::transaction(function () use ($request, $pet, $data): Visit {
            $visit = $pet->visits()->make($data);
            $visit->recorded_by = $request->user()->id;
            $visit->save();
            ActivityLog::record('Visit recorded', $visit);

            return $visit;
        });
    }

    public function update(Request $request, Visit $visit): Visit
    {
        $request->validate(['pet_id' => ['prohibited'], 'recorded_by' => ['prohibited']]);
        $data = $this->validated($request);

        return DB::transaction(function () use ($visit, $data): Visit {
            $visit->update($data);
            ActivityLog::record('Visit updated', $visit);

            return $visit;
        });
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'visited_at' => ['required', 'date', 'before_or_equal:now'],
            'purpose' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ]);
    }
}
