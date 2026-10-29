<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountReady
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user->profileComplete(), 403, 'Complete your profile before continuing.');
        abort_unless($user->approval_status === 'approved', 403, 'Your account is '.$user->approval_status.'.');
        abort_if($user->role === 'owner' && $user->client?->archived_at, 403, 'Your client record is archived. Please contact the clinic.');

        return $next($request);
    }
}
