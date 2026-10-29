<?php

namespace Tests\Feature;

use App\Models\Client;
use App\Models\Pet;
use App\Models\User;
use App\Models\Visit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class PetFaveApiTest extends TestCase
{
    use RefreshDatabase;

    private function owner(): User
    {
        $user = User::factory()->create();
        Client::factory()->create(['user_id' => $user->id]);

        return $user;
    }

    private function registration(string $role = 'owner'): array
    {
        return [
            'name' => 'Jamie Cruz',
            'email' => 'jamie@example.com',
            'contact_number' => '09171234567',
            'address' => 'Quezon City',
            'password' => 'petfave-password',
            'password_confirmation' => 'petfave-password',
            'role' => $role,
        ];
    }

    public function test_protected_routes_require_authentication(): void
    {
        foreach (['me', 'clients', 'pets', 'visits', 'corrections', 'users', 'activity'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertUnauthorized();
        }
        $this->postJson('/api/v1/pets', [])->assertUnauthorized();
    }

    public function test_owner_registration_creates_an_active_session_and_client(): void
    {
        $this->postJson('/api/auth/register', $this->registration())
            ->assertSuccessful()->assertJsonPath('data.role', 'owner')
            ->assertJsonPath('data.approval_status', 'approved')->assertJsonPath('data.profile_complete', true);
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.email', 'jamie@example.com');
        $this->assertDatabaseHas('clients', ['email' => 'jamie@example.com']);
        $this->assertDatabaseMissing('users', ['password' => 'petfave-password']);
    }

    public function test_public_registration_rejects_admin_privileges_and_duplicate_emails(): void
    {
        $this->postJson('/api/auth/register', $this->registration('admin'))->assertUnprocessable()->assertJsonValidationErrors('role');
        $this->postJson('/api/auth/register', [...$this->registration(), 'approval_status' => 'approved'])->assertUnprocessable();
        User::factory()->create(['email' => 'jamie@example.com']);
        $this->postJson('/api/auth/register', $this->registration())->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_pending_staff_can_only_access_status_and_logout(): void
    {
        $this->postJson('/api/auth/register', $this->registration('staff'))->assertSuccessful()->assertJsonPath('data.approval_status', 'pending');
        foreach (['clients', 'pets', 'visits', 'users', 'activity', 'corrections'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertForbidden();
        }
        $this->putJson('/api/v1/profile', ['name' => 'Changed'])->assertForbidden();
        $this->getJson('/api/v1/me')->assertOk();
        $this->postJson('/api/auth/logout')->assertOk();
        $this->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_password_login_and_logout_use_the_session(): void
    {
        $user = $this->owner();
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'password'])->assertOk();
        $this->assertAuthenticatedAs($user);
        $this->postJson('/api/auth/logout')->assertOk();
        $this->assertGuest();
    }

    public function test_unrecognized_roles_cannot_access_any_clinic_collections(): void
    {
        $user = User::factory()->create(['role' => 'unrecognized']);
        $this->actingAs($user);
        foreach (['clients', 'pets', 'visits', 'corrections', 'users', 'activity'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertForbidden();
        }
    }

    public function test_owner_lists_and_ids_never_expose_other_client_records(): void
    {
        $owner = $this->owner();
        $other = $this->owner();
        $ownPet = Pet::factory()->create(['client_id' => $owner->client->id]);
        $otherPet = Pet::factory()->create(['client_id' => $other->client->id]);
        $ownVisit = Visit::factory()->create(['pet_id' => $ownPet->id]);
        $otherVisit = Visit::factory()->create(['pet_id' => $otherPet->id]);

        $this->actingAs($owner);
        $this->getJson('/api/v1/clients')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $owner->client->id);
        $this->getJson('/api/v1/pets?archived=1')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ownPet->id);
        $this->getJson('/api/v1/visits')->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ownVisit->id);
        $this->getJson('/api/v1/clients/'.$other->client->id)->assertForbidden();
        $this->getJson('/api/v1/pets/'.$otherPet->id)->assertForbidden();
        $this->getJson('/api/v1/visits/'.$otherVisit->id)->assertForbidden();
        $this->getJson('/api/v1/pets?client_id='.$other->client->id)->assertJsonCount(0, 'data');
        $this->deleteJson('/api/v1/pets/'.$otherPet->id)->assertForbidden();
    }

    public function test_owner_can_manage_pets_but_cannot_assign_ownership_or_edit_visits(): void
    {
        $owner = $this->owner();
        $other = $this->owner();
        $this->actingAs($owner);
        $this->postJson('/api/v1/pets', ['name' => 'Milo', 'species' => 'Cat', 'sex' => 'male', 'client_id' => $other->client->id])->assertUnprocessable();
        $pet = $this->postJson('/api/v1/pets', ['name' => 'Milo', 'species' => 'Cat', 'sex' => 'male'])->assertSuccessful()->json('id');
        $this->assertDatabaseHas('pets', ['id' => $pet, 'client_id' => $owner->client->id]);
        $this->assertDatabaseHas('ownerships', ['pet_id' => $pet, 'client_id' => $owner->client->id, 'ended_at' => null]);
        $this->putJson('/api/v1/pets/'.$pet, ['name' => 'Milo II', 'species' => 'Cat', 'sex' => 'male'])->assertOk();
        $this->postJson('/api/v1/pets/'.$pet.'/ownership', ['client_id' => $other->client->id])->assertForbidden();
        $this->postJson('/api/v1/visits', ['pet_id' => $pet])->assertForbidden();
        $visit = Visit::factory()->create(['pet_id' => $pet]);
        $this->putJson('/api/v1/visits/'.$visit->id, ['purpose' => 'Forged'])->assertForbidden();
        $this->deleteJson('/api/v1/pets/'.$pet)->assertOk();
        $this->getJson('/api/v1/pets')->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/visits')->assertJsonCount(1, 'data');
    }

    public function test_profile_update_cannot_change_role_approval_or_email(): void
    {
        $owner = $this->owner();
        $this->actingAs($owner);
        $profile = ['name' => 'Updated Owner', 'contact_number' => '09171111111', 'address' => 'Manila'];
        foreach (['role' => 'admin', 'approval_status' => 'approved', 'email' => 'another@example.com'] as $field => $value) {
            $this->putJson('/api/v1/profile', [...$profile, $field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        $this->putJson('/api/v1/profile', $profile)->assertOk()->assertJsonPath('data.role', 'owner');
        $this->assertDatabaseHas('clients', ['user_id' => $owner->id, 'name' => 'Updated Owner']);
    }

    public function test_staff_can_search_and_record_visits_but_cannot_manage_clients_pets_or_users(): void
    {
        $staff = User::factory()->create(['role' => 'staff']);
        $pet = Pet::factory()->create();
        $this->actingAs($staff);
        $this->getJson('/api/v1/clients?search='.urlencode($pet->client->name))->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/clients/'.$pet->client_id)->assertOk();
        $visit = $this->postJson('/api/v1/visits', ['pet_id' => $pet->id, 'visited_at' => now()->subHour()->toIso8601String(), 'purpose' => 'Registration visit', 'notes' => 'Contact details confirmed.'])->assertSuccessful()->json('id');
        $this->putJson('/api/v1/visits/'.$visit, ['visited_at' => now()->subHour()->toIso8601String(), 'purpose' => 'Updated visit'])->assertOk();
        $this->putJson('/api/v1/visits/'.$visit, ['pet_id' => $pet->id])->assertUnprocessable();
        $this->postJson('/api/v1/pets', [])->assertForbidden();
        $this->putJson('/api/v1/clients/'.$pet->client_id, [])->assertForbidden();
        $this->getJson('/api/v1/users')->assertForbidden();
        $this->getJson('/api/v1/activity')->assertForbidden();
        $this->getJson('/api/v1/corrections')->assertForbidden();
    }

    public function test_administrator_can_approve_and_reject_staff_and_review_logs(): void
    {
        $staff = User::factory()->create(['role' => 'staff', 'approval_status' => 'pending']);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->putJson('/api/v1/users/'.$staff->id, ['role' => 'staff', 'approval_status' => 'approved'])->assertOk();
        $this->actingAs($staff->fresh())->getJson('/api/v1/clients')->assertOk();
        $this->actingAs($admin)->putJson('/api/v1/users/'.$staff->id, ['role' => 'staff', 'approval_status' => 'rejected'])->assertOk();
        $this->actingAs($staff->fresh())->getJson('/api/v1/clients')->assertForbidden();
        $this->actingAs($admin)->getJson('/api/v1/activity')->assertOk()->assertJsonCount(2, 'data');
        $this->putJson('/api/v1/users/'.$admin->id, ['role' => 'owner', 'approval_status' => 'rejected'])->assertUnprocessable();
    }

    public function test_ownership_transfer_preserves_history_and_revokes_previous_owner_access(): void
    {
        $owner = $this->owner();
        $newOwner = $this->owner();
        $pet = Pet::factory()->create(['client_id' => $owner->client->id]);
        $pet->ownerships()->create(['client_id' => $owner->client->id, 'started_at' => now()->subMonth()]);
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->postJson('/api/v1/pets/'.$pet->id.'/ownership', ['client_id' => $newOwner->client->id])->assertOk();
        $this->assertDatabaseHas('ownerships', ['pet_id' => $pet->id, 'client_id' => $newOwner->client->id, 'ended_at' => null]);
        $this->assertNotNull($pet->ownerships()->where('client_id', $owner->client->id)->first()->ended_at);
        $this->actingAs($owner)->getJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->actingAs($newOwner)->getJson('/api/v1/pets/'.$pet->id)->assertOk()->assertJsonMissingPath('ownerships');
    }

    public function test_corrections_require_owned_records_and_matching_visit_and_apply_only_on_admin_approval(): void
    {
        $owner = $this->owner();
        $pet = Pet::factory()->create(['client_id' => $owner->client->id]);
        $visit = Visit::factory()->create(['pet_id' => $pet->id]);
        $otherVisit = Visit::factory()->create();
        $this->actingAs($owner);
        $this->postJson('/api/v1/corrections', ['pet_id' => $pet->id, 'type' => 'visit', 'visit_id' => $otherVisit->id, 'description' => 'Please correct the visit date.'])->assertUnprocessable();
        $id = $this->postJson('/api/v1/corrections', ['pet_id' => $pet->id, 'type' => 'visit', 'visit_id' => $visit->id, 'description' => 'Please correct the visit purpose.'])->assertSuccessful()->json('id');
        $this->putJson('/api/v1/corrections/'.$id.'/resolve', [])->assertForbidden();
        $other = $this->owner();
        $this->actingAs($other)->getJson('/api/v1/corrections/'.$id)->assertForbidden();
        $this->getJson('/api/v1/corrections')->assertJsonCount(0, 'data');
        $admin = User::factory()->create(['role' => 'admin']);
        $body = ['status' => 'approved', 'resolution' => 'Confirmed with the front desk.', 'purpose' => 'Corrected visit purpose', 'visited_at' => $visit->visited_at->toIso8601String()];
        $this->actingAs($admin)->putJson('/api/v1/corrections/'.$id.'/resolve', $body)->assertOk()->assertJsonPath('status', 'approved');
        $this->assertDatabaseHas('visits', ['id' => $visit->id, 'purpose' => 'Corrected visit purpose']);
        $this->putJson('/api/v1/corrections/'.$id.'/resolve', $body)->assertConflict();
    }

    public function test_rejected_correction_preserves_visit_and_approved_ownership_correction_transfers_pet(): void
    {
        $owner = $this->owner();
        $newOwner = $this->owner();
        $pet = Pet::factory()->create(['client_id' => $owner->client->id]);
        $visit = Visit::factory()->create(['pet_id' => $pet->id]);
        $this->actingAs($owner);
        $visitRequest = $this->postJson('/api/v1/corrections', ['type' => 'visit', 'pet_id' => $pet->id, 'visit_id' => $visit->id, 'description' => 'Please update this visit.'])->json('id');
        $ownershipRequest = $this->postJson('/api/v1/corrections', ['type' => 'ownership', 'pet_id' => $pet->id, 'description' => 'Please change the registered owner.'])->json('id');
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin)->putJson('/api/v1/corrections/'.$visitRequest.'/resolve', ['status' => 'rejected', 'resolution' => 'Original details confirmed.'])->assertOk();
        $this->assertDatabaseHas('visits', ['id' => $visit->id, 'purpose' => $visit->purpose]);
        $this->putJson('/api/v1/corrections/'.$ownershipRequest.'/resolve', ['status' => 'approved', 'resolution' => 'Ownership details confirmed.', 'client_id' => $newOwner->client->id])->assertOk();
        $this->assertDatabaseHas('pets', ['id' => $pet->id, 'client_id' => $newOwner->client->id]);
        $this->actingAs($owner)->getJson('/api/v1/corrections/'.$visitRequest)->assertOk()->assertJsonMissingPath('visit')->assertJsonPath('pet', null);
        $this->getJson('/api/v1/corrections')->assertOk()->assertJsonMissingPath('data.0.visit');
    }

    public function test_incomplete_and_archived_profiles_cannot_access_clinic_records(): void
    {
        $user = User::factory()->create(['contact_number' => null]);
        $this->actingAs($user)->getJson('/api/v1/pets')->assertForbidden();
        $this->putJson('/api/v1/profile', ['name' => $user->name, 'contact_number' => '09171234567', 'address' => 'Manila'])->assertOk()->assertJsonPath('data.profile_complete', true);
        $this->getJson('/api/v1/pets')->assertOk();
        $user->client->forceFill(['archived_at' => now()])->save();
        $this->actingAs($user->fresh())->getJson('/api/v1/pets')->assertForbidden();
    }

    private function google(string $subject, string $email, bool $verified = true): void
    {
        $google = (new GoogleUser)->setRaw(['email_verified' => $verified])->map(['id' => $subject, 'name' => 'Google Owner', 'email' => $email]);
        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->once()->andReturn($google);
        Socialite::shouldReceive('driver')->with('google')->once()->andReturn($provider);
    }

    public function test_google_registration_requires_role_and_profile_completion(): void
    {
        $this->google('subject-1', 'google@example.com');
        $this->withSession(['google_registration_role' => 'staff'])->get('/auth/google/callback')->assertRedirect(config('petfave.frontend_url').'/');
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.role', 'staff')->assertJsonPath('data.approval_status', 'pending')->assertJsonPath('data.profile_complete', false);
        $this->getJson('/api/v1/clients')->assertForbidden();
        $this->putJson('/api/v1/profile', ['name' => 'Google Staff', 'contact_number' => '09171234567', 'address' => 'Manila'])->assertOk();
        $this->getJson('/api/v1/clients')->assertForbidden();
    }

    public function test_google_login_preserves_existing_role_and_approval(): void
    {
        User::factory()->create(['google_id' => 'known-subject', 'email' => 'known@example.com', 'role' => 'staff', 'approval_status' => 'rejected']);
        $this->google('known-subject', 'known@example.com');
        $this->withSession(['google_registration_role' => 'owner'])->get('/auth/google/callback')->assertRedirect();
        $this->getJson('/api/v1/me')->assertOk()->assertJsonPath('data.role', 'staff')->assertJsonPath('data.approval_status', 'rejected');
    }

    public function test_google_does_not_link_matching_email_to_existing_password_account(): void
    {
        User::factory()->create(['email' => 'existing@example.com']);
        $this->google('different-subject', 'existing@example.com');
        $this->withSession(['google_registration_role' => 'owner'])->get('/auth/google/callback')->assertRedirect(config('petfave.frontend_url').'/login?error=account_exists');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseMissing('users', ['google_id' => 'different-subject']);
    }

    public function test_google_rejects_unverified_email(): void
    {
        $this->google('unverified-subject', 'unverified@example.com', false);
        $this->get('/auth/google/callback')->assertRedirect(config('petfave.frontend_url').'/login?error=google_unverified');
        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }
}
