<?php

namespace App\Models;

use Database\Factories\VisitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Visit extends Model
{
    /** @use HasFactory<VisitFactory> */
    use HasFactory;

    protected $fillable = ['visited_at', 'purpose', 'notes'];

    protected function casts(): array
    {
        return ['visited_at' => 'datetime'];
    }

    public function pet(): BelongsTo
    {
        return $this->belongsTo(Pet::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
