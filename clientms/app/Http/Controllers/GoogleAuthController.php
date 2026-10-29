<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirect(Request $request): RedirectResponse
    {
        if (! config('services.google.client_id') || ! config('services.google.client_secret')) {
            return redirect(rtrim(config('petfave.frontend_url'), '/').'/login?error=google_not_configured');
        }
        $data = $request->validate(['role' => ['nullable', Rule::in(['owner', 'staff'])]]);
        $request->session()->put('google_registration_role', $data['role'] ?? null);

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontend = rtrim(config('petfave.frontend_url'), '/');

        try {
            $google = Socialite::driver('google')->user();
            $role = $request->session()->pull('google_registration_role');
            if (! $google->getId() || ! $google->getEmail() || ($google->user['email_verified'] ?? false) !== true) {
                return redirect($frontend.'/login?error=google_unverified');
            }

            $user = User::where('google_id', $google->getId())->first();
            if (! $user) {
                if (User::where('email', strtolower($google->getEmail()))->exists()) {
                    return redirect($frontend.'/login?error=account_exists');
                }
                if (! in_array($role, ['owner', 'staff'], true)) {
                    return redirect($frontend.'/register?error=choose_role');
                }

                $user = new User;
                $user->forceFill([
                    'name' => $google->getName() ?: '',
                    'email' => strtolower($google->getEmail()),
                    'email_verified_at' => now(),
                    'google_id' => $google->getId(),
                    'password' => Str::random(64),
                    'role' => $role,
                    'approval_status' => $role === 'staff' ? 'pending' : 'approved',
                ])->save();
            }

            Auth::login($user);
            $request->session()->regenerate();
            ActivityLog::record('Signed in with Google', $user);

            return redirect($frontend.'/');
        } catch (Throwable $exception) {
            report($exception);

            return redirect($frontend.'/login?error=google_failed');
        }
    }
}
