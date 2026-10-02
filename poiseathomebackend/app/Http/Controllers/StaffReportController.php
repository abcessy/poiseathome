<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\AppointmentProductUsage;
use Carbon\Carbon;
use App\Services\ReportExportService;

class StaffReportController extends Controller
{
    protected $exporter;

    public function __construct(ReportExportService $exporter)
    {
        $this->exporter = $exporter;
    }

    protected function getDates(Request $request)
    {
        $start = $request->input('start_date', Carbon::now()->subDays(30)->toDateString());
        $end = $request->input('end_date', Carbon::now()->toDateString());
        return [Carbon::parse($start)->startOfDay(), Carbon::parse($end)->endOfDay()];
    }

    public function overview(Request $request)
    {
        [$start, $end] = $this->getDates($request);
        $staffId = $request->user()->id;

        $appointments = Appointment::where('staff_user_id', $staffId)
            ->whereBetween('appointment_date', [$start, $end])
            ->get();

        $today = Carbon::now()->toDateString();
        $todayApps = Appointment::where('staff_user_id', $staffId)
            ->where('appointment_date', $today)
            ->whereNotIn('status', ['cancelled'])
            ->get();

        $data = [
            'appointments_today' => $todayApps->count(),
            'appointments_upcoming' => $appointments->whereIn('status', ['pending', 'confirmed'])->where('appointment_date', '>=', $today)->count(),
            'appointments_completed' => $appointments->where('status', 'completed')->count(),
            'appointments_cancelled' => $appointments->where('status', 'cancelled')->count(),
            'services_performed' => $appointments->where('status', 'completed')->count(), // simplistic for now
        ];

        if ($request->has('format')) {
            $summaryRows = [
                ['metric' => 'Appointments Today', 'value' => $data['appointments_today']],
                ['metric' => 'Upcoming Appointments', 'value' => $data['appointments_upcoming']],
                ['metric' => 'Completed Appointments', 'value' => $data['appointments_completed']],
                ['metric' => 'Cancelled Appointments', 'value' => $data['appointments_cancelled']],
                ['metric' => 'Services Performed', 'value' => $data['services_performed']],
            ];
            return $this->exporter->export(
                $request->format,
                $summaryRows,
                ['metric' => 'Staff Operational Metric', 'value' => 'Count'],
                'Staff Overview Report'
            );
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function productUsage(Request $request)
    {
        [$start, $end] = $this->getDates($request);
        $staffId = $request->user()->id;

        $query = AppointmentProductUsage::with(['appointment', 'product'])
            ->where('recorded_by', $staffId)
            ->whereBetween('created_at', [$start, $end]);

        $data = $query->orderBy('created_at', 'desc')->get()->map(function ($u) {
            return [
                'appointment_number' => $u->appointment->appointment_number ?? 'N/A',
                'service' => $u->appointment->service_name_snapshot ?? 'N/A',
                'product' => $u->product->name ?? 'N/A',
                'quantity' => $u->quantity,
                'unit' => $u->product->unit ?? '',
                'recorded_date' => $u->created_at->format('Y-m-d H:i:s'),
                'reversed' => $u->reversed_at ? 'Yes' : 'No'
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'appointment_number' => 'Appointment #',
                'service' => 'Service',
                'product' => 'Product',
                'quantity' => 'Quantity',
                'unit' => 'Unit',
                'recorded_date' => 'Date',
                'reversed' => 'Reversed'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'My Product Usage');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
