<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuditLogController extends Controller
{
    /**
     * Display a listing of audit logs with filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::with('user:id,name,email,role')
            ->latest('created_at');

        // Filter by action
        if ($request->filled('action')) {
            $query->where('action', $request->input('action'));
        }

        // Filter by role
        if ($request->filled('role')) {
            $query->where('user_role', $request->input('role'));
        }

        // Filter by user ID
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->input('user_id'));
        }

        // Filter by date range
        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', Carbon::parse($request->input('start_date'))->startOfDay());
        }
        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', Carbon::parse($request->input('end_date'))->endOfDay());
        }

        // Search in description, user_name, action, ip_address
        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhere('user_name', 'like', "%{$search}%")
                    ->orWhere('action', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 20)));
        $logs = $query->paginate($perPage);

        // Stats summary
        $todayStart = Carbon::today();
        $stats = [
            'total_logs' => AuditLog::count(),
            'today_logs' => AuditLog::where('created_at', '>=', $todayStart)->count(),
            'actions_count' => AuditLog::selectRaw('action, count(*) as count')
                ->groupBy('action')
                ->orderByDesc('count')
                ->limit(8)
                ->pluck('count', 'action'),
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'logs' => $logs->items(),
                'pagination' => [
                    'current_page' => $logs->currentPage(),
                    'last_page' => $logs->lastPage(),
                    'per_page' => $logs->perPage(),
                    'total' => $logs->total(),
                ],
                'stats' => $stats,
            ],
        ]);
    }

    /**
     * Display a specific audit log entry.
     */
    public function show(AuditLog $auditLog): JsonResponse
    {
        $auditLog->load('user:id,name,email,role');

        return response()->json([
            'status' => 'success',
            'data' => $auditLog,
        ]);
    }
}
