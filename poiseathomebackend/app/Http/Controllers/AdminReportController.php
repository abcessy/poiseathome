<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\AppointmentPayment;
use App\Models\Product;
use App\Models\ProductInventory;
use App\Models\StockMovement;
use App\Models\AppointmentProductUsage;
use App\Models\Service;
use App\Models\User;
use Carbon\Carbon;
use App\Services\ReportExportService;

class AdminReportController extends Controller
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

        $appointments = Appointment::whereBetween('appointment_date', [$start, $end])->get();
        $payments = AppointmentPayment::whereBetween('submitted_at', [$start, $end])->get();

        $completedValue = $appointments->where('status', 'completed')->sum('service_price_snapshot');
        $verifiedValue = $payments->where('status', 'verified')->sum('amount');
        $chartStart = Carbon::now()->subDays(6)->startOfDay();
        $chartAppointments = Appointment::whereBetween('appointment_date', [$chartStart, Carbon::now()->endOfDay()])->get();
        $chartPayments = AppointmentPayment::where('status', 'verified')
            ->whereBetween('submitted_at', [$chartStart, Carbon::now()->endOfDay()])
            ->get();

        $dailyActivity = collect(range(0, 6))->map(function (int $offset) use ($chartStart, $chartAppointments, $chartPayments) {
            $date = $chartStart->copy()->addDays($offset);

            return [
                'date' => $date->toDateString(),
                'label' => $date->format('D'),
                'appointments' => $chartAppointments->filter(fn ($appointment) => Carbon::parse($appointment->appointment_date)->isSameDay($date))->count(),
                'revenue' => (float) $chartPayments->filter(fn ($payment) => Carbon::parse($payment->submitted_at)->isSameDay($date))->sum('amount'),
            ];
        })->values();

        $data = [
            'total_customers' => User::where('role', 'customer')->count(),
            'active_staff' => User::where('role', 'staff')->where('is_active', true)->count(),
            'active_services' => Service::where('is_active', true)->count(),
            
            'appointments_total' => $appointments->count(),
            'appointments_pending' => $appointments->where('status', 'pending')->count(),
            'appointments_confirmed' => $appointments->where('status', 'confirmed')->count(),
            'appointments_in_progress' => $appointments->where('status', 'in_progress')->count(),
            'appointments_completed' => $appointments->where('status', 'completed')->count(),
            'appointments_cancelled' => $appointments->where('status', 'cancelled')->count(),
            
            'completed_service_value' => $completedValue,
            
            'payments_pending' => $payments->where('status', 'pending_verification')->count(),
            'verified_payment_value' => $verifiedValue,
            
            'low_stock_products' => ProductInventory::where('low_stock_alert_active', true)->count(),
            'out_of_stock_products' => ProductInventory::where('out_of_stock_alert_active', true)->count(),
            'appointment_statuses' => [
                ['label' => 'Pending', 'value' => $appointments->where('status', 'pending')->count()],
                ['label' => 'Confirmed', 'value' => $appointments->where('status', 'confirmed')->count()],
                ['label' => 'In progress', 'value' => $appointments->where('status', 'in_progress')->count()],
                ['label' => 'Completed', 'value' => $appointments->where('status', 'completed')->count()],
                ['label' => 'Cancelled', 'value' => $appointments->where('status', 'cancelled')->count()],
            ],
            'daily_activity' => $dailyActivity,
        ];

        if ($request->has('format')) {
            $summaryRows = [
                ['metric' => 'Total Customers', 'value' => $data['total_customers']],
                ['metric' => 'Active Staff', 'value' => $data['active_staff']],
                ['metric' => 'Active Services Offered', 'value' => $data['active_services']],
                ['metric' => 'Total Appointments Booked', 'value' => $data['appointments_total']],
                ['metric' => 'Pending Appointments', 'value' => $data['appointments_pending']],
                ['metric' => 'Confirmed Appointments', 'value' => $data['appointments_confirmed']],
                ['metric' => 'In Progress Appointments', 'value' => $data['appointments_in_progress']],
                ['metric' => 'Completed Appointments', 'value' => $data['appointments_completed']],
                ['metric' => 'Cancelled Appointments', 'value' => $data['appointments_cancelled']],
                ['metric' => 'Completed Service Value (PHP)', 'value' => number_format((float) $data['completed_service_value'], 2)],
                ['metric' => 'Verified Payment Total (PHP)', 'value' => number_format((float) $data['verified_payment_value'], 2)],
                ['metric' => 'Low Stock Products Alert', 'value' => $data['low_stock_products']],
                ['metric' => 'Out of Stock Products', 'value' => $data['out_of_stock_products']],
            ];
            return $this->exporter->export(
                $request->format,
                $summaryRows,
                ['metric' => 'Operational Metric', 'value' => 'Value / Count'],
                'Overview Report'
            );
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function appointments(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $query = Appointment::with(['customer', 'staff', 'service', 'payments'])
            ->whereBetween('appointment_date', [$start, $end]);

        if ($request->has('status')) $query->where('status', $request->status);
        if ($request->has('staff_id')) $query->where('staff_user_id', $request->staff_id);

        $data = $query->orderBy('appointment_date', 'desc')->get()->map(function ($app) {
            $verifiedAmount = $app->payments->where('status', 'verified')->sum('amount');
            $paymentState = 'unpaid';
            if ($verifiedAmount >= $app->service_price_snapshot) $paymentState = 'paid';
            elseif ($verifiedAmount > 0) $paymentState = 'partially_paid';
            elseif ($app->payments->where('status', 'pending_verification')->count() > 0) $paymentState = 'pending_verification';

            return [
                'appointment_number' => $app->appointment_number,
                'customer_name' => $app->customer_name_snapshot,
                'service_name' => $app->service_name_snapshot,
                'staff_name' => $app->staff->name ?? 'Unknown',
                'appointment_date' => $app->appointment_date,
                'start_time' => $app->start_time,
                'status' => $app->status,
                'service_price' => $app->service_price_snapshot,
                'required_downpayment' => $app->required_downpayment_amount,
                'verified_amount' => $verifiedAmount,
                'payment_state' => $paymentState,
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'appointment_number' => 'Appointment #',
                'customer_name' => 'Customer',
                'service_name' => 'Service',
                'staff_name' => 'Staff',
                'appointment_date' => 'Date',
                'start_time' => 'Start Time',
                'status' => 'Status',
                'service_price' => 'Price',
                'verified_amount' => 'Paid Amount'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Appointments Report');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function payments(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $query = AppointmentPayment::with(['appointment.customer'])
            ->whereBetween('submitted_at', [$start, $end]);

        if ($request->has('status')) $query->where('status', $request->status);

        $data = $query->orderBy('submitted_at', 'desc')->get()->map(function ($p) {
            return [
                'id' => $p->id,
                'appointment_number' => $p->appointment->appointment_number ?? 'N/A',
                'customer_name' => $p->appointment->customer_name_snapshot ?? 'N/A',
                'payment_method' => $p->payment_method,
                'amount' => $p->amount,
                'status' => $p->status,
                'submitted_at' => $p->submitted_at,
                'verified_at' => $p->verified_at,
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'id' => 'Payment ID',
                'appointment_number' => 'Appointment #',
                'customer_name' => 'Customer',
                'payment_method' => 'Method',
                'amount' => 'Amount',
                'status' => 'Status',
                'submitted_at' => 'Submitted At',
                'verified_at' => 'Verified At'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Payments Report');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function completedServices(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $query = Appointment::with(['customer', 'staff', 'service'])
            ->where('status', 'completed')
            ->whereBetween('appointment_date', [$start, $end]);

        $appointments = $query->orderBy('appointment_date', 'desc')->get();
        
        $data = $appointments->map(function ($app) {
            return [
                'appointment_number' => $app->appointment_number,
                'customer_name' => $app->customer_name_snapshot,
                'service_name' => $app->service_name_snapshot,
                'staff_name' => $app->staff->name ?? 'Unknown',
                'completed_date' => $app->completed_at ? $app->completed_at->format('Y-m-d') : $app->appointment_date,
                'service_price' => $app->service_price_snapshot,
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'appointment_number' => 'Appointment #',
                'customer_name' => 'Customer',
                'service_name' => 'Service',
                'staff_name' => 'Staff',
                'completed_date' => 'Date',
                'service_price' => 'Completed Service Value'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Completed Services');
        }

        return response()->json([
            'status' => 'success',
            'summary' => [
                'completed_count' => $appointments->count(),
                'completed_value' => $appointments->sum('service_price_snapshot'),
                'average_value' => $appointments->count() > 0 ? $appointments->avg('service_price_snapshot') : 0,
            ],
            'data' => $data
        ]);
    }

    public function staffPerformance(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $staff = User::with(['profile', 'services'])
            ->where('role', 'staff')
            ->get();

        $appointments = Appointment::whereBetween('appointment_date', [$start, $end])->get();

        $data = $staff->map(function ($s) use ($appointments) {
            $staffApps = $appointments->where('staff_user_id', $s->id);
            $completed = $staffApps->where('status', 'completed');
            $cancelled = $staffApps->where('status', 'cancelled');
            
            return [
                'staff_name' => $s->name,
                'specialization' => $s->profile?->specialization ?? 'N/A',
                'completed_appointments' => $completed->count(),
                'cancelled_appointments' => $cancelled->count(),
                'availability' => $s->profile?->is_available ? 'Available' : 'Unavailable',
                'completed_service_value' => $completed->sum('service_price_snapshot'),
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'staff_name' => 'Staff Name',
                'specialization' => 'Specialization',
                'completed_appointments' => 'Completed',
                'cancelled_appointments' => 'Cancelled',
                'availability' => 'Availability',
                'completed_service_value' => 'Completed Value'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Staff Performance');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function servicePerformance(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $services = Service::with(['category', 'qualifiedStaff'])->get();
        $appointments = Appointment::whereBetween('appointment_date', [$start, $end])->get();

        $data = $services->map(function ($s) use ($appointments) {
            $serviceApps = $appointments->where('service_id', $s->id);
            $completed = $serviceApps->where('status', 'completed');
            $cancelled = $serviceApps->where('status', 'cancelled');
            
            return [
                'service_name' => $s->name,
                'category' => $s->category->name ?? 'N/A',
                'completed_appointments' => $completed->count(),
                'cancelled_appointments' => $cancelled->count(),
                'completed_service_value' => $completed->sum('service_price_snapshot'),
                'qualified_staff_count' => $s->qualifiedStaff->count()
            ];
        })->sortByDesc('completed_appointments')->values();

        if ($request->has('format')) {
            $headers = [
                'service_name' => 'Service',
                'category' => 'Category',
                'completed_appointments' => 'Completed Count',
                'cancelled_appointments' => 'Cancelled Count',
                'completed_service_value' => 'Total Value',
                'qualified_staff_count' => 'Qualified Staff'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Service Performance');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function productUsage(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $query = AppointmentProductUsage::with(['appointment', 'product', 'staff'])
            ->whereBetween('created_at', [$start, $end]);

        $data = $query->orderBy('created_at', 'desc')->get()->map(function ($u) {
            return [
                'appointment_number' => $u->appointment->appointment_number ?? 'N/A',
                'service' => $u->appointment->service_name_snapshot ?? 'N/A',
                'staff' => $u->staff->name ?? 'N/A',
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
                'staff' => 'Staff',
                'product' => 'Product',
                'quantity' => 'Quantity',
                'unit' => 'Unit',
                'recorded_date' => 'Date',
                'reversed' => 'Reversed'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Product Usage');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function inventory(Request $request)
    {
        $query = ProductInventory::with(['product.category']);
        if ($request->has('low_stock_only')) $query->where('low_stock_alert_active', true)->orWhere('out_of_stock_alert_active', true);
        
        $data = $query->get()->map(function ($inv) {
            $status = 'In Stock';
            if ($inv->out_of_stock_alert_active) $status = 'Out of Stock';
            elseif ($inv->low_stock_alert_active) $status = 'Low Stock';

            return [
                'sku' => $inv->product->sku,
                'product_name' => $inv->product->name,
                'category' => $inv->product->category->name ?? 'N/A',
                'available_quantity' => $inv->available_quantity,
                'unit' => $inv->product->unit,
                'threshold' => $inv->product->low_stock_threshold,
                'status' => $status
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'sku' => 'SKU',
                'product_name' => 'Product',
                'category' => 'Category',
                'available_quantity' => 'Available',
                'unit' => 'Unit',
                'threshold' => 'Threshold',
                'status' => 'Status'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Inventory Report');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }

    public function stockMovements(Request $request)
    {
        [$start, $end] = $this->getDates($request);

        $query = StockMovement::with(['product', 'performer'])
            ->whereBetween('created_at', [$start, $end]);

        $data = $query->orderBy('created_at', 'desc')->get()->map(function ($m) {
            return [
                'date' => $m->created_at->format('Y-m-d H:i:s'),
                'product' => $m->product->name ?? 'Unknown',
                'movement_type' => $m->movement_type,
                'quantity' => $m->quantity,
                'before' => $m->quantity_before,
                'after' => $m->quantity_after,
                'performed_by' => $m->performer->name ?? 'System',
                'notes' => $m->notes,
            ];
        });

        if ($request->has('format')) {
            $headers = [
                'date' => 'Date',
                'product' => 'Product',
                'movement_type' => 'Type',
                'quantity' => 'Qty',
                'before' => 'Before',
                'after' => 'After',
                'performed_by' => 'Performed By',
                'notes' => 'Notes'
            ];
            return $this->exporter->export($request->format, $data, $headers, 'Stock Movements');
        }

        return response()->json(['status' => 'success', 'data' => $data]);
    }
}
