# PetFave React frontend

This Vite + React app connects to the Laravel API in `../clientms`. All records come from the API; authentication uses an HttpOnly session cookie and a readable CSRF cookie. No authentication tokens are stored in browser storage.

## Run locally

Use Node 22.12 or newer. The backend must be configured and migrated first; see `../clientms/README.md`.

```powershell
npm install
Copy-Item .env.example .env # only if .env does not already exist
npm run dev
```

Open **http://localhost:5173**. Run `php artisan serve --host=127.0.0.1 --port=8000` from `clientms` in another terminal. Use `localhost` consistently in your browser so the session and CSRF cookies share a host.

`VITE_API_URL` is empty by default. Vite proxies `/api`, `/sanctum`, and `/auth/google` to `VITE_API_PROXY_TARGET` (default `http://127.0.0.1:8000`). The proxy is development-only.

## Accounts

- Register as **Pet Owner** for immediate access to your own profile, pets, visit histories, and correction requests.
- Register as **Clinic Staff** for a pending account. An administrator must approve it before clinic records become accessible.
- The local database is seeded with `admin@petfave.test`; use `ADMIN_PASSWORD` from the backend `.env`. Additional administrators can be created with the backend's `petfave:create-admin` command.
- Google registration uses the selected role and requires missing contact information before access. Backend Google credentials are required.

An administrator can register clinic client records independently of sign-in accounts. Public registration creates a new owner account and its linked client record; existing client records are never attached automatically based on an email match.

## Production build

```powershell
npm run build
```

Serve `dist` with an SPA fallback to `index.html`. Configure your production reverse proxy to forward `/api`, `/sanctum`, and `/auth/google` to Laravel, or set `VITE_API_URL` to the HTTPS API origin before building. For separate frontend/API subdomains, configure Laravel's allowed origin, Sanctum stateful domain, and shared parent cookie domain. Frontend and backend must share the same parent site for Sanctum SPA cookies.

Google client secrets belong only in the backend `.env`. Never put secrets in variables beginning with `VITE_`.
