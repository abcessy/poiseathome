<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Record an audit log entry.
     */
    public static function log(
        string $action,
        string $description,
        ?Model $auditable = null,
        array $properties = [],
        ?User $user = null
    ): AuditLog {
        $activeUser = $user ?? Auth::user();

        $userName = $activeUser?->name ?? 'System';
        $userRole = $activeUser?->role ?? 'system';

        return AuditLog::create([
            'user_id' => $activeUser?->id,
            'user_name' => $userName,
            'user_role' => ucfirst((string) $userRole),
            'action' => strtoupper($action),
            'description' => $description,
            'auditable_type' => $auditable ? get_class($auditable) : null,
            'auditable_id' => $auditable?->getKey(),
            'properties' => !empty($properties) ? $properties : null,
            'ip_address' => Request::ip() ?? '127.0.0.1',
            'user_agent' => Request::userAgent() ?? 'System / CLI',
        ]);
    }
}
