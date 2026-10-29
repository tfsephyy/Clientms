<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('owner')->index();
            $table->string('approval_status')->default('approved')->index();
            $table->string('contact_number', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('google_id')->nullable()->unique();
        });

        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('contact_number', 30);
            $table->text('address');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->string('name', 120);
            $table->string('species', 80);
            $table->string('breed', 120)->nullable();
            $table->string('sex', 20)->default('unknown');
            $table->date('birth_date')->nullable();
            $table->string('color', 120)->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ownerships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('client_id')->constrained()->restrictOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->timestamps();
        });

        Schema::create('visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('visited_at')->index();
            $table->string('purpose');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('correction_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('pet_id')->constrained()->restrictOnDelete();
            $table->foreignId('visit_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('type');
            $table->text('description');
            $table->string('status')->default('pending')->index();
            $table->text('resolution')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        foreach (['activity_logs', 'correction_requests', 'visits', 'ownerships', 'pets', 'clients'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'approval_status', 'contact_number', 'address', 'google_id']);
        });
    }
};
