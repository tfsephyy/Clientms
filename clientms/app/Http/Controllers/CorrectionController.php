<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\CorrectionRequest;
use App\Models\Pet;
use App\Models\Visit;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CorrectionController extends Controller
{
    public function index(Request $request): LengthAwarePaginator
    {
        $query = CorrectionRequest::query();
        if ($request->user()->role === 'owner') {
            $query->where('user_id', $request->user()->id);
            $query->with(['pet' => fn ($query) => $query->select('id', 'name', 'client_id')->whereHas('client', fn ($query) => $query->where('user_id', $request->user()->id))]);
        } else {
            $query->with(['pet:id,name', 'visit', 'requester:id,name']);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->value());
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($query) => $query->where('description', 'like', '%'.$search.'%')->orWhere('type', 'like', '%'.$search.'%'));
        }

        return $query->latest()->paginate(20);
    }

    public function show(Request $request, CorrectionRequest $correction): CorrectionRequest
    {
        abort_unless($request->user()->role === 'admin' || $correction->user_id === $request->user()->id, 403);

        if ($request->user()->role === 'admin') {
            return $correction->load(['pet:id,name', 'visit', 'requester:id,name']);
        }

        return $correction->load(['pet' => fn ($query) => $query->select('id', 'name', 'client_id')->whereHas('client', fn ($query) => $query->where('user_id', $request->user()->id))]);
    }

    public function store(Request $request): CorrectionRequest
    {
        $data = $request->validate([
            'pet_id' => ['required', 'integer', 'exists:pets,id'],
            'type' => ['required', Rule::in(['visit', 'ownership'])],
            'visit_id' => ['required_if:type,visit', 'prohibited_unless:type,visit', 'nullable', 'integer', 'exists:visits,id'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
        ]);
        $pet = Pet::findOrFail($data['pet_id']);
        Gate::authorize('view', $pet);
        if ($data['type'] === 'visit') {
            abort_unless(Visit::whereKey($data['visit_id'])->where('pet_id', $pet->id)->exists(), 422, 'The visit does not belong to this pet.');
        }

        return DB::transaction(function () use ($data, $request): CorrectionRequest {
            $correction = CorrectionRequest::create([...$data, 'user_id' => $request->user()->id]);
            ActivityLog::record('Correction requested', $correction);

            return $correction;
        });
    }

    public function resolve(Request $request, CorrectionRequest $correction): CorrectionRequest
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'resolution' => ['required', 'string', 'min:5', 'max:5000'],
        ]);

        $changes = [];
        if ($data['status'] === 'approved') {
            $changes = $correction->type === 'visit'
                ? $request->validate([
                    'visited_at' => ['required', 'date', 'before_or_equal:now'],
                    'purpose' => ['required', 'string', 'max:255'],
                    'notes' => ['nullable', 'string', 'max:5000'],
                ])
                : $request->validate(['client_id' => ['required', 'integer', 'exists:clients,id']]);
        }

        return DB::transaction(function () use ($correction, $data, $changes, $request): CorrectionRequest {
            $correction = CorrectionRequest::lockForUpdate()->findOrFail($correction->id);
            abort_unless($correction->status === 'pending', 409, 'This request has already been resolved.');
            if ($data['status'] === 'approved') {
                if ($correction->type === 'visit') {
                    $visit = Visit::findOrFail($correction->visit_id);
                    $visit->update($changes);
                    ActivityLog::record('Visit corrected', $visit);
                } else {
                    app(PetController::class)->changeOwner($correction->pet, (int) $changes['client_id']);
                }
            }

            $correction->update([
                ...$data,
                'resolved_by' => $request->user()->id,
                'resolved_at' => now(),
            ]);
            ActivityLog::record('Correction '.$data['status'], $correction);

            return $correction;
        });
    }
}
