# PetFave Laravel API

`clientms` is the Laravel backend; `../clientms-front` is the Vite + React frontend. The backend owns MySQL persistence, Sanctum session authentication, Google OAuth verification, roles, staff approvals, record ownership, and activity logs.

## Local setup

Requirements: PHP 8.3+, Composer, MySQL, and Node 22.12+ for the frontend.

```powershell
composer install
Copy-Item .env.example .env # only if .env does not already exist
php artisan key:generate   # only for a new environment without APP_KEY
```

Create the MySQL database `petfave_clientms` and configure `DB_*` in `.env`. The local workspace has already been configured and migrated against that database. Existing databases are not used or reset.

```powershell
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Before seeding a new environment, configure `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 12 characters), `ADMIN_NAME`, `ADMIN_CONTACT_NUMBER`, and `ADMIN_ADDRESS` in the backend `.env`. The current local environment already has a generated administrator password and is seeded. Passwords are hashed in the database; no password is committed to the source or this README.

Re-running `php artisan migrate --seed` preserves existing administrator accounts and passwords. A conflicting non-admin account is never promoted by the seeder. To create an additional administrator interactively, run `php artisan petfave:create-admin another-admin@example.com`; it prompts for the profile and a hidden password.

Local sample data is enabled by `SEED_DEMO_DATA=true` and requires a separate `DEMO_PASSWORD` of at least 12 characters. It includes `staff.demo@petfave.test` (approved staff), `pending.demo@petfave.test` (pending staff), `owner.demo@petfave.test` (pet owner), two clients, three pets with ownership records, three basic clinic visits, and a pending correction request. These sample accounts use `DEMO_PASSWORD`. Repeating the seed does not duplicate the unchanged sample records or reset account approvals. Set `SEED_DEMO_DATA=false` outside local development; the demo seeder rejects production environments.

In another terminal:

```powershell
cd ../clientms-front
npm install
npm run dev
```

Open **http://localhost:5173**. Use the same hostname consistently; avoid mixing `localhost` and `127.0.0.1` in browser URLs.

## Environment and authentication

```dotenv
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000,127.0.0.1:5173,127.0.0.1:8000
SESSION_DRIVER=database
SESSION_COOKIE=petfave_session
SESSION_DOMAIN=null
SESSION_HTTP_ONLY=true
SESSION_SECURE_COOKIE=false
SESSION_SAME_SITE=lax
```

After environment changes, run `php artisan config:clear` and restart the servers.

The frontend initializes `/sanctum/csrf-cookie` before registration/login, sends cookies on API requests, and copies `XSRF-TOKEN` into `X-XSRF-TOKEN`. The session is regenerated on login and invalidated on logout. Browser developer tools show both cookies; only the CSRF cookie is accessible to JavaScript.

## Google sign-in

Create credentials in your own Google Cloud project:

1. Open [Google Cloud Console → Google Auth Platform](https://console.cloud.google.com/auth/overview) and select or create a project such as **PetFave**.
2. Under **Branding**, enter the application name, user support email, and developer contact email.
3. Under **Audience**, use **External** for personal Google accounts. While testing, add the Google accounts you will use under **Test users**.
4. Under **Clients**, create an OAuth client with application type **Web application**.
5. Add the exact **Authorized redirect URI** `http://localhost:8000/auth/google/callback`. This app uses server-side Socialite OAuth, so a JavaScript client secret or Google JavaScript SDK is not needed.
6. Copy the issued client ID and secret into the backend `.env`, or download the OAuth client JSON and keep it outside the public directories. Do not place the secret in the React `.env`.

See [Google's server-side OAuth setup guide](https://developers.google.com/identity/protocols/oauth2/web-server#creatingcred). Backend settings:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

Run `php artisan config:clear` after saving the credentials, then restart the backend. Open `http://localhost:5173` in a normal browser, choose a registration role for a new account, and use **Google**. Existing Google accounts can sign in from the login screen. The provider consent screen must accept the chosen Google account for the real callback to complete. Missing credentials return a clear message on the login screen.

New users choose Pet Owner or Clinic Staff on the registration page before using Google. Missing contact information is collected after the callback. Staff accounts remain pending until approved. Existing Google accounts retain their role and approval status. An existing password account with the same email must use password login; this implementation does not automatically link accounts. OAuth state and Google's verified email are checked on the backend. Provider tokens are never sent to React.

## API and permissions

Auth routes: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`.

The protected API uses `/api/v1`:

| Resource | Behavior |
| --- | --- |
| `GET /me`, `PUT /profile` | Authenticated account status and contact details. Incomplete Google profiles can be completed; pending/rejected complete accounts can only check status and log out. |
| `/clients` | Admin creates, updates, and archives. Staff searches and reads. Owners can only read their own record. |
| `/pets` | Admin manages all; owners manage only their own. Staff reads. `DELETE` archives and retains history. |
| `POST /pets/{id}/ownership` | Admin transfers ownership and preserves previous ownership dates. |
| `/visits` | Admin/staff record and update basic visit details. Owners read only their own pets' visits. |
| `/corrections` | Owners submit and view their requests; admins review. `PUT /corrections/{id}/resolve` applies an approved visit/ownership correction and records the decision in a transaction. |
| `/users` | Admin reviews staff and manages fixed role permissions and account access. |
| `GET /activity` | Admin-only audit history. |

Collections are paginated. `search`, `page`, `archived=1` (clients/pets), and `status` (users/corrections) support list screens. Individual record policies and scoped queries enforce ownership independently of the UI. Unauthorized API requests return 401; forbidden requests return 403. Public registration never accepts the admin role or a supplied approval status.

Clinic client records may exist without user accounts. Owner registrations create a linked client record. These records are never linked automatically by email.

## Verification

```powershell
php artisan test --compact
```

Tests use isolated in-memory SQLite and do not reset MySQL. They cover sessions, registration, approval restrictions, roles, ownership isolation, transfers, correction decisions, and mocked Google callbacks. A real Google callback requires configured OAuth credentials.

## HTTPS deployment

Serve Laravel with its document root set to `public`, and the React build with an SPA fallback. Prefer a same-origin reverse proxy for `/api`, `/sanctum`, and `/auth/google`. Vite's development proxy is not part of the production build.

Set `APP_ENV=production`, `APP_DEBUG=false`, HTTPS `APP_URL` and `FRONTEND_URL`, the production Google callback URI, `SESSION_SECURE_COOKIE=true`, and the correct `SANCTUM_STATEFUL_DOMAINS` (host and port only). For sibling subdomains set `SESSION_DOMAIN=.your-domain.example` so the frontend can read the CSRF cookie; keep `SESSION_HTTP_ONLY=true` for the session. Use exact credentialed CORS origins. Run migrations and rebuild the frontend for its deployment environment.

No reports, diagnoses, treatments, prescriptions, or medical record modules are included.
