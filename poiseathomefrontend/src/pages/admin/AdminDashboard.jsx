import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CalendarDays, CircleDollarSign, Clock3, PackageSearch, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { fetchApi } from '../../services/api';
import { formatMoney } from '../../utils/formatters';

const palette = ['#a63bc7', '#e357b7', '#6f3cc3', '#26a69a', '#d97706'];

const BarsChart = ({ rows }) => {
  const max = Math.max(...rows.map(row => row.appointments), 1);
  return <div className="mt-7 flex h-44 items-end gap-3">{rows.map(row => <div key={row.date} className="flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-xs font-semibold text-primary-deep">{row.appointments || ''}</span><div className="mx-auto w-full max-w-9 rounded-t-lg bg-gradient-to-t from-primary-deep to-fuchsia-400 hover:opacity-80" style={{ height: `${Math.max((row.appointments / max) * 120, 5)}px` }} title={`${row.appointments} appointments`} /><span className="text-[11px] font-medium text-text-muted">{row.label}</span></div>)}</div>;
};

const StatusChart = ({ rows }) => {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return <div className="mt-6 min-w-0">
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">{total > 0 && rows.map((row, index) => <span key={row.label} style={{ width: `${(row.value / total) * 100}%`, background: palette[index] }} />)}</div>
    <div className="mt-5 space-y-3">{rows.map((row, index) => <div key={row.label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: palette[index] }} /><span className="truncate text-sm text-text-muted">{row.label}</span></div><div className="ml-4 mt-1 h-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full" style={{ width: `${total ? (row.value / total) * 100 : 0}%`, background: palette[index] }} /></div></div><strong className="text-sm tabular-nums">{row.value}</strong></div>)}</div>
    {total === 0 && <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-text-muted">No appointments in the current 30-day window.</p>}
  </div>;
};

const RevenueChart = ({ rows }) => {
  const values = rows.map(row => Number(row.revenue));
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => `${12 + index * 46},${112 - (value / max) * 88}`).join(' ');
  return <div className="mt-5"><svg viewBox="0 0 300 130" className="h-40 w-full overflow-visible" role="img" aria-label="Verified revenue for the last seven days"><defs><linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e357b7" stopOpacity=".35" /><stop offset="1" stopColor="#e357b7" stopOpacity="0" /></linearGradient></defs>{points && <><path d={`M ${points} L 288 120 L 12 120 Z`} fill="url(#revenueFill)" /><polyline points={points} fill="none" stroke="#a63bc7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></>}{values.map((value, index) => <circle key={rows[index].date} cx={12 + index * 46} cy={112 - (value / max) * 88} r="4" fill="white" stroke="#a63bc7" strokeWidth="3"><title>{formatMoney(value)}</title></circle>)}</svg><div className="grid grid-cols-7 text-center text-[11px] font-medium text-text-muted">{rows.map(row => <span key={row.date}>{row.label}</span>)}</div></div>;
};

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { const loadOverview = async () => { try { const response = await fetchApi('/admin/reports/overview'); if (!response.ok) throw new Error(); setData((await response.json()).data); } catch { setError('Dashboard information could not be loaded.'); } }; loadOverview(); }, []);
  const cards = [
    { title: 'Appointments', note: 'Last 30 days', value: data?.appointments_total || 0, link: '/admin/appointments', icon: CalendarDays },
    { title: 'Awaiting schedule', note: 'Pending confirmation', value: data?.appointments_pending || 0, link: '/admin/appointments', icon: Clock3 },
    { title: 'Payment queue', note: 'Needs review', value: data?.payments_pending || 0, link: '/admin/payments', icon: CircleDollarSign, attention: data?.payments_pending > 0 },
    { title: 'Stock signals', note: 'Low-stock products', value: data?.low_stock_products || 0, link: '/admin/inventory', icon: PackageSearch, attention: data?.low_stock_products > 0 },
  ];
  const activity = data?.daily_activity || [];
  const statuses = data?.appointment_statuses || [];
  return <DashboardLayout role="admin">
    <section className="relative overflow-hidden rounded-2xl bg-[#29172f] px-6 py-7 text-white sm:px-8"><div className="absolute -right-12 -top-28 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-fuchsia-200"><Sparkles className="h-4 w-4" />Salon pulse</span><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your business, at a glance.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Live signals from appointments, verified payments, and inventory activity.</p></div><div className="rounded-xl bg-white/10 px-5 py-3 ring-1 ring-white/15 backdrop-blur"><p className="text-xs text-white/60">Completed service value</p><p className="mt-1 text-2xl font-bold">{formatMoney(data?.completed_service_value || 0)}</p></div></div></section>
    {error && <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, ...card }) => <Link key={card.title} to={card.link} className={`group rounded-2xl border bg-white p-5 transition-transform hover:-translate-y-0.5 ${card.attention ? 'border-fuchsia-200' : 'border-gray-200'}`}><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.attention ? 'bg-fuchsia-50 text-fuchsia-700' : 'bg-lavender text-primary-deep'}`}><Icon className="h-5 w-5" /></span><ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-primary-purple" /></div><p className="mt-5 text-3xl font-bold tracking-tight">{card.value}</p><p className="mt-1 text-sm font-semibold">{card.title}</p><p className="text-xs text-text-muted">{card.note}</p></Link>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-12"><section className="rounded-2xl border border-gray-200 bg-white p-6 xl:col-span-5"><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Booking rhythm</p><h2 className="mt-1 text-lg font-bold">Appointments this week</h2><BarsChart rows={activity} /></section><section className="rounded-2xl border border-gray-200 bg-white p-6 xl:col-span-3"><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Current mix</p><h2 className="mt-1 text-lg font-bold">Appointment status</h2><StatusChart rows={statuses} /></section><section className="rounded-2xl border border-gray-200 bg-white p-6 xl:col-span-4"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Cashflow</p><h2 className="mt-1 text-lg font-bold">Verified revenue</h2></div><span className="rounded-full bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">7 days</span></div><RevenueChart rows={activity} /></section></div>
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-purple-100 bg-gradient-to-r from-lavender/70 to-white p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Need the deeper numbers?</h2><p className="mt-1 text-sm text-text-muted">Filter date ranges and export operational reports.</p></div><Link to="/admin/reports" className="btn-outline shrink-0">Open reports <ArrowUpRight className="h-4 w-4" /></Link></div>
  </DashboardLayout>;
};

export default AdminDashboard;
