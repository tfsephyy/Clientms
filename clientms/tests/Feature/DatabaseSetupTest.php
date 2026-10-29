<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Pet;
use App\Models\User;
use App\Models\Visit;
use Database\Seeders\AdminSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class DatabaseSetupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'seeding.admin' => [
                'name' => 'PetFave Administrator',
                'email' => 'admin@petfave.test',
                'password' => 'Admin-seed-password-2026',
                'contact_number' => '09170000001',
                'address' => 'PetFave Clinic, Manila',
            ],
            'seeding.demo.enabled' => false,
            'seeding.demo.password' => 'Demo-seed-password-2026',
        ]);
    }

    public function test_seeding_creates_a_complete_approved_admin_that_can_sign_in(): void
    {
        $this->seed(DatabaseSeeder::class);
        $admin = User::where('email', 'admin@petfave.test')->sole();
        $this->assertSame('admin', $admin->role);
        $this->assertSame('approved', $admin->approval_status);
        $this->assertTrue($admin->profileComplete());
        $this->assertTrue(Hash::check('Admin-seed-password-2026', $admin->password));
        $this->assertDatabaseCount('clients', 0);
        $this->postJson('/api/auth/login', ['email' => $admin->email, 'password' => 'Admin-seed-password-2026'])
            ->assertOk()->assertJsonPath('data.role', 'admin');
        $this->getJson('/api/v1/users')->assertOk();
    }

    public function test_repeated_seeding_preserves_existing_admin_password_and_profile(): void
    {
        $this->seed(AdminSeeder::class);
        $admin = User::where('email', 'admin@petfave.test')->sole();
        $originalPassword = $admin->password;
        $admin->name = 'Administrator Custom Name';
        $admin->save();
        config(['seeding.admin.password' => 'A-different-password-2026']);
        $this->seed(AdminSeeder::class);
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseCount('activity_logs', 1);
        $this->assertSame($originalPassword, $admin->fresh()->password);
        $this->assertSame('Administrator Custom Name', $admin->fresh()->name);
    }

    public function test_seeding_never_promotes_an_existing_owner_with_the_admin_email(): void
    {
        $owner = User::factory()->create(['email' => 'admin@petfave.test']);
        try {
            $this->seed(AdminSeeder::class);
            $this->fail('Seeding should reject a conflicting non-admin account.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('existing non-administrator', $exception->getMessage());
        }
        $this->assertSame('owner', $owner->fresh()->role);
        $this->assertDatabaseCount('activity_logs', 0);
    }

    public function test_missing_admin_password_does_not_create_an_account(): void
    {
        config(['seeding.admin.password' => null]);
        try {
            $this->seed(AdminSeeder::class);
            $this->fail('Seeding should require an admin password.');
        } catch (ValidationException $exception) {
            $this->assertArrayHasKey('password', $exception->errors());
        }
        $this->assertDatabaseCount('users', 0);
    }

    public function test_local_demo_data_has_valid_relationships_and_can_be_seeded_repeatedly(): void
    {
        config(['seeding.demo.enabled' => true]);
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);
        $this->assertDatabaseCount('users', 4);
        $this->assertDatabaseCount('clients', 2);
        $this->assertDatabaseCount('pets', 3);
        $this->assertDatabaseCount('ownerships', 3);
        $this->assertDatabaseCount('visits', 3);
        $this->assertDatabaseCount('correction_requests', 1);

        foreach (Pet::all() as $pet) {
            $ownership = $pet->ownerships()->sole();
            $this->assertSame($pet->client_id, $ownership->client_id);
            $this->assertNull($ownership->ended_at);
        }
        foreach (Visit::all() as $visit) {
            $this->assertSame('staff', $visit->recorder->role);
            $this->assertSame('approved', $visit->recorder->approval_status);
        }
        $owner = User::where('email', 'owner.demo@petfave.test')->sole();
        $this->assertSame($owner->id, Client::where('user_id', $owner->id)->sole()->user_id);
        $this->actingAs($owner)->getJson('/api/v1/pets')->assertOk()->assertJsonCount(2, 'data');
        $pending = User::where('email', 'pending.demo@petfave.test')->sole();
        $this->actingAs($pending)->getJson('/api/v1/clients')->assertForbidden();
    }

    public function test_demo_seeding_is_rejected_in_production(): void
    {
        $this->app->instance('env', 'production');
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('local or testing environments');
        $this->app->make(DemoSeeder::class)->run();
    }

    public function test_missing_google_credentials_return_a_clear_frontend_error(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);
        $this->get('/auth/google/redirect')
            ->assertRedirect(config('petfave.frontend_url').'/login?error=google_not_configured');
    }

    public function test_configured_google_redirect_uses_backend_credentials_and_oauth_state(): void
    {
        config([
            'services.google.client_id' => 'test-client.apps.googleusercontent.com',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.redirect' => 'http://localhost:8000/auth/google/callback',
        ]);
        $response = $this->get('/auth/google/redirect?role=staff')->assertRedirect();
        $url = $response->headers->get('Location');
        $this->assertSame('accounts.google.com', parse_url($url, PHP_URL_HOST));
        parse_str(parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame('test-client.apps.googleusercontent.com', $query['client_id']);
        $this->assertSame('http://localhost:8000/auth/google/callback', $query['redirect_uri']);
        $this->assertNotEmpty($query['state']);
        $this->assertStringContainsString('openid', $query['scope']);
        $this->assertStringNotContainsString('test-client-secret', $url);
        $response->assertSessionHas('google_registration_role', 'staff');
    }
}
