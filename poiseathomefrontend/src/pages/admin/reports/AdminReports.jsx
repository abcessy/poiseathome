import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, API_BASE_URL } from '../../../services/api';
import { Activity, CalendarRange, Download, PackageSearch, Printer, Scissors, Users } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';

const reportTabs = [
  { id: 'overview', label: 'Overview', endpoint: '/admin/reports/overview' },
  { id: 'appointments', label: 'Appointments', endpoint: '/admin/reports/appointments' },
  { id: 'completed-services', label: 'Completed Services', endpoint: '/admin/reports/completed-services' },
  { id: 'service-performance', label: 'Service Performance', endpoint: '/admin/reports/service-performance' },
  { id: 'staff-performance', label: 'Staff Performance', endpoint: '/admin/reports/staff-performance' },
  { id: 'payments', label: 'Payments', endpoint: '/admin/reports/payments' },
  { id: 'inventory', label: 'Inventory', endpoint: '/admin/reports/inventory' },
  { id: 'low-stock', label: 'Low Stock', endpoint: '/admin/reports/inventory?low_stock_only=true' },
  { id: 'stock-movements', label: 'Stock Movements', endpoint: '/admin/reports/stock-movements' },
  { id: 'product-usage', label: 'Product Usage', endpoint: '/admin/reports/product-usage' },
];

const statusColors = ['#d946ef', '#8b5cf6', '#6366f1', '#10b981', '#ef4444'];

const ReportOverview = ({ data, dateRange }) => {
  const activity = data.daily_activity || [];
  const statuses = data.appointment_statuses || [];
  const statusTotal = statuses.reduce((sum, item) => sum + item.value, 0);
  const maxAppointments = Math.max(...activity.map(item => item.appointments), 1);
  const maxRevenue = Math.max(...activity.map(item => Number(item.revenue)), 1);
  const completionRate = data.appointments_total ? Math.round((data.appointments_completed / data.appointments_total) * 100) : 0;

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl bg-[#29172f] p-6 text-white sm:p-8">
      <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-fuchsia-200"><CalendarRange className="h-4 w-4" />Reporting period</p><h2 className="mt-3 text-3xl font-bold tracking-tight">Operational performance</h2><p className="mt-2 text-sm text-white/65">{dateRange.start_date} through {dateRange.end_date}</p></div><div className="grid grid-cols-2 gap-7 border-t border-white/15 pt-5 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><div><p className="text-xs text-white/55">Completed services</p><p className="mt-1 text-2xl font-bold">{formatMoney(data.completed_service_value || 0)}</p></div><div><p className="text-xs text-white/55">Verified payments</p><p className="mt-1 text-2xl font-bold text-fuchsia-200">{formatMoney(data.verified_payment_value || 0)}</p></div></div></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-purple-100 bg-white"><div className="grid divide-y divide-purple-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
      {[['Customers', data.total_customers, Users], ['Active staff', data.active_staff, Activity], ['Services offered', data.active_services, Scissors], ['Completion rate', `${completionRate}%`, CalendarRange]].map(([label, value, Icon]) => <div key={label} className="flex items-center gap-4 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lavender text-primary-deep"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold tracking-tight">{value}</p><p className="text-xs font-medium text-text-muted">{label}</p></div></div>)}
    </div></section>

    <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-2xl border border-gray-200 bg-white p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Seven-day signal</p><h3 className="mt-1 text-xl font-bold">Bookings and verified revenue</h3></div><p className="text-xs text-text-muted">Bars show bookings · line shows revenue</p></div>
        <div className="mt-8 flex h-56 items-end gap-2 sm:gap-4">{activity.map(item => <div key={item.date} className="group flex h-full flex-1 flex-col justify-end"><div className="relative flex flex-1 items-end justify-center"><div className="absolute bottom-0 w-full max-w-10 rounded-t-lg bg-gradient-to-t from-primary-deep to-fuchsia-400/75" style={{ height: `${Math.max((item.appointments / maxAppointments) * 150, 4)}px` }} /><span className="absolute z-10 rounded-full border-2 border-primary-purple bg-white" style={{ bottom: `${Math.max((Number(item.revenue) / maxRevenue) * 150, 2)}px`, width: 10, height: 10 }} title={formatMoney(item.revenue)} /></div><div className="mt-3 text-center"><p className="text-xs font-bold">{item.appointments}</p><p className="text-[10px] text-text-muted">{item.label}</p></div></div>)}</div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Appointment flow</p><h3 className="mt-1 text-xl font-bold">Where bookings stand</h3><div className="mt-6 flex h-3 overflow-hidden rounded-full bg-gray-100">{statusTotal > 0 && statuses.map((item, index) => <span key={item.label} style={{ width: `${(item.value / statusTotal) * 100}%`, backgroundColor: statusColors[index] }} />)}</div><div className="mt-6 space-y-4">{statuses.map((item, index) => <div key={item.label} className="grid grid-cols-[.75rem_1fr_auto] items-center gap-3"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[index] }} /><div><p className="text-sm font-semibold">{item.label}</p><p className="text-xs text-text-muted">{statusTotal ? Math.round((item.value / statusTotal) * 100) : 0}% of bookings</p></div><strong className="text-lg tabular-nums">{item.value}</strong></div>)}</div>{statusTotal === 0 && <p className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-text-muted">No appointments were recorded for this period.</p>}</section>
    </div>

    <section className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white lg:grid-cols-[1fr_auto]"><div className="p-6"><div className="flex items-start gap-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><PackageSearch className="h-5 w-5" /></span><div><h3 className="font-bold">Inventory watch</h3><p className="mt-1 text-sm text-text-muted">Stock conditions that may affect upcoming services.</p></div></div></div><div className="grid grid-cols-2 border-t border-gray-100 lg:border-l lg:border-t-0"><div className="min-w-32 p-5 text-center"><p className="text-2xl font-bold text-amber-700">{data.low_stock_products || 0}</p><p className="text-xs text-text-muted">Low stock</p></div><div className="min-w-32 border-l border-gray-100 p-5 text-center"><p className="text-2xl font-bold text-red-700">{data.out_of_stock_products || 0}</p><p className="text-xs text-text-muted">Out of stock</p></div></div></section>
  </div>;
};

const AdminReports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadReport = async () => {
    setLoading(true);
    setError('');
    const tab = reportTabs.find(t => t.id === activeTab);
    const query = new URLSearchParams({ start_date: dateRange.start_date, end_date: dateRange.end_date });
    try {
      const separator = tab.endpoint.includes('?') ? '&' : '?';
      const res = await fetchApi(`${tab.endpoint}${separator}${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        setData(null);
        setError('This report could not be loaded. Please try again.');
      }
    } catch {
      setData(null);
      setError('This report could not be loaded. Please check your connection.');
    } finally { setLoading(false); }
    };
    loadReport();
  }, [activeTab, dateRange.start_date, dateRange.end_date]);

  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    const tab = reportTabs.find(t => t.id === activeTab);
    if (!tab) return;
    const query = new URLSearchParams({ 
      start_date: dateRange.start_date, 
      end_date: dateRange.end_date,
      format 
    });
    
    setExporting(true);
    try {
      const separator = tab.endpoint.includes('?') ? '&' : '?';
      const endpoint = `${tab.endpoint}${separator}${query.toString()}`;
      const res = await fetchApi(endpoint);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poise-${tab.id}-${dateRange.start_date}_${dateRange.end_date}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      await messageDialog('The report export failed. Please check your connection and try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderTable = (items) => {
    if (!items || items.length === 0) return <div className="p-8 text-center text-text-muted">No data found for this period.</div>;
    const keys = Object.keys(items[0]);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-text-primary">
          <thead className="bg-lavender text-primary-purple">
            <tr>
              {keys.map(k => (
                <th key={k} className="px-4 py-3 font-semibold uppercase whitespace-nowrap">
                  {k.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {keys.map(k => (
                  <td key={k} className="px-4 py-3 whitespace-nowrap">
                    {(k.includes('amount') || k.includes('price') || k.includes('value')) && item[k] !== null
                      ? formatMoney(item[k])
                      : item[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout role="admin">
      <div className="print-friendly">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 no-print">
          <div><h1 className="page-title">Reports & Analytics</h1><p className="mt-2 text-sm text-text-muted">Filter, review, and export operational reports.</p></div>
          <div className="flex flex-wrap gap-2">
            <button 
              disabled={exporting} 
              onClick={() => handleExport('csv')} 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-text-primary hover:bg-gray-50 flex items-center text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exporting...' : 'CSV'}
            </button>
            <button 
              disabled={exporting} 
              onClick={() => handleExport('pdf')} 
              className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-text-primary hover:bg-gray-50 flex items-center text-sm font-medium disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" /> {exporting ? 'Exporting...' : 'PDF'}
            </button>
            <button onClick={handlePrint} className="px-4 py-2 bg-primary-purple text-white rounded-lg hover:bg-primary-deep flex items-center text-sm font-bold">
              <Printer className="w-4 h-4 mr-2" /> Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 no-print">
            {reportTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id ? 'border-primary-purple text-primary-purple' : 'border-transparent text-text-muted hover:text-text-primary hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-b border-gray-100 bg-white p-4 sm:flex-row sm:items-end no-print">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">Start Date</label>
              <input type="date" value={dateRange.start_date} onChange={e => setDateRange({...dateRange, start_date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">End Date</label>
              <input type="date" value={dateRange.end_date} onChange={e => setDateRange({...dateRange, end_date: e.target.value})} className="px-3 py-2 border rounded-lg text-sm" />
            </div>
          </div>

          <div className="p-6 min-h-[400px]">
            {/* Print Header */}
            <div className="hidden print-block mb-8">
              <h2 className="text-2xl font-bold text-primary-purple mb-2">Poise Hair Center - {reportTabs.find(t=>t.id===activeTab).label}</h2>
              <p className="text-sm text-gray-500">Period: {dateRange.start_date} to {dateRange.end_date}</p>
            </div>

            {loading ? (
              <div className="text-center text-text-muted py-12">Loading report data...</div>
            ) : error ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
            ) : (
              <div>
                {activeTab === 'overview' && data ? (
                  <ReportOverview data={data} dateRange={dateRange} />
                ) : (
                  Array.isArray(data) && renderTable(data)
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminReports;
