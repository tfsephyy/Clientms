<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): UserResource
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'lowercase', 'unique:users'],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:2000'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::in(['owner', 'staff'])],
            'approval_status' => ['prohibited'],
        ]);

        $user = DB::transaction(function () use ($data): User {
            $user = new User;
            $user->forceFill(collect($data)->except('password_confirmation')->all());
            $user->approval_status = $data['role'] === 'staff' ? 'pending' : 'approved';
            $user->save();
            if ($user->role === 'owner') {
                $user->client()->create(collect($data)->only(['name', 'email', 'contact_number', 'address'])->all());
            }

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();
        ActivityLog::record('Account registered', $user);

        return new UserResource($user);
    }

    public function login(Request $request): UserResource
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            throw ValidationException::withMessages(['email' => ['The email or password is incorrect.']]);
        }

        $request->session()->regenerate();
        ActivityLog::record('Signed in', $request->user());

        return new UserResource($request->user());
    }

    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->fresh());
    }

    public function profile(Request $request): UserResource
    {
        $user = $request->user();
        abort_if($user->profileComplete() && $user->approval_status !== 'approved', 403, 'Your account is '.$user->approval_status.'.');
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_number' => ['required', 'string', 'max:30'],
            'address' => ['required', 'string', 'max:2000'],
            'role' => ['prohibited'],
            'approval_status' => ['prohibited'],
            'email' => ['prohibited'],
        ]);

        DB::transaction(function () use ($user, $data): void {
            $user->forceFill($data)->save();
            if ($user->role === 'owner') {
                $user->client()->updateOrCreate([], [...$data, 'email' => $user->email]);
            }
            ActivityLog::record('Profile updated', $user);
        });

        return new UserResource($user->fresh());
    }

    public function logout(Request $request): JsonResponse
    {
        ActivityLog::record('Signed out', $request->user());
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        Auth::guard('sanctum')->forgetUser();

        return response()->json(['message' => 'Signed out.']);
    }
}
