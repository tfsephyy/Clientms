<?php

namespace App\Models;

use Database\Factories\PetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pet extends Model
{
    /** @use HasFactory<PetFactory> */
    use HasFactory;

    protected $fillable = ['name', 'species', 'breed', 'sex', 'birth_date', 'color'];

    protected function casts(): array
    {
        return ['birth_date' => 'date:Y-m-d', 'archived_at' => 'datetime'];
    }

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(Visit::class);
    }

    public function ownerships(): HasMany
    {
        return $this->hasMany(Ownership::class);
    }
}
