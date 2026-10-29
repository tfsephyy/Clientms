<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    protected $guarded = ['id'];

    public static function record(string $action, Model $subject): void
    {
        self::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => class_basename($subject),
            'subject_id' => $subject->getKey(),
        ]);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
