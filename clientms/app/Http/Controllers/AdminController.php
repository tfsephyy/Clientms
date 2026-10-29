<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function users(Request $request): AnonymousResourceCollection
    {
        $query = User::with('client');
        if ($request->filled('status')) {
            $query->where('approval_status', $request->string('status')->value());
        }
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($query) => $query->where('name', 'like', '%'.$search.'%')->orWhere('email', 'like', '%'.$search.'%'));
        }

        return UserResource::collection($query->latest()->paginate(20));
    }

    public function updateUser(Request $request, User $user): UserResource
    {
        abort_if($user->id === $request->user()->id, 422, 'You cannot change your own role or approval status.');
        $data = $request->validate([
            'role' => ['required', Rule::in(['admin', 'staff', 'owner'])],
            'approval_status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
        ]);
        abort_if($data['role'] !== 'staff' && $data['approval_status'] === 'pending', 422, 'Only staff accounts can be pending.');
        abort_if($data['approval_status'] === 'approved' && ! $user->profileComplete(), 422, 'The user must complete their profile first.');

        DB::transaction(function () use ($user, $data): void {
            $user->forceFill($data)->save();
            if ($user->role === 'owner' && ! $user->client && $user->profileComplete()) {
                $user->client()->create($user->only(['name', 'email', 'contact_number', 'address']));
            }
            ActivityLog::record('Account permissions updated', $user);
        });

        return new UserResource($user->fresh());
    }

    public function activity(Request $request): LengthAwarePaginator
    {
        $query = ActivityLog::with('actor:id,name');
        if ($search = $request->string('search')->trim()->value()) {
            $query->where(fn ($query) => $query->where('action', 'like', '%'.$search.'%')->orWhere('subject_type', 'like', '%'.$search.'%')->orWhereHas('actor', fn ($query) => $query->where('name', 'like', '%'.$search.'%')));
        }

        return $query->latest('id')->paginate(30);
    }
}
