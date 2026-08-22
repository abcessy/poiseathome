import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../../../services/api';
import { formatDate, formatTime } from '../../../utils/formatters';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { ArrowRight, Calendar, CalendarPlus, Clock, Scissors } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-violet-100 text-violet-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

export const PaymentStatusBadge = ({ state }) => {
  const styles = {
    unpaid: 'bg-red-50 text-red-700 border border-red-100',
    pending_verification: 'bg-orange-50 text-orange-700 border border-orange-100',
    partially_paid: 'bg-blue-50 text-blue-700 border border-blue-100',
    paid: 'bg-green-50 text-green-700 border border-green-100',
  };
  const labels = {
    unpaid: 'Not Submitted',
    pending_verification: 'Under Review',
    partially_paid: 'Downpayment Verified',
    paid: 'Paid',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${styles[state]}`}>
      {labels[state]}
    </span>
  );
};

const CustomerAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming'); // upcoming, past

  useEffect(() => {
    loadAppointments();
  }, [filter]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/customer/appointments');
      if (res.ok) {
        const all = (await res.json()).data;
        // Basic frontend filtering for demo purposes
        const todayStr = new Date().toISOString().split('T')[0];
        if (filter === 'upcoming') {
          setAppointments(all.filter(a => a.appointment_date >= todayStr && !['completed', 'cancelled'].includes(a.status)));
        } else {
          setAppointments(all.filter(a => a.appointment_date < todayStr || ['completed', 'cancelled'].includes(a.status)));
        }
      }
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="customer">
      <section className="relative mb-6 overflow-hidden rounded-3xl bg-[#301837] px-6 py-8 text-white sm:px-8"><div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-fuchsia-500/25 blur-3xl" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-fuchsia-200">Your salon calendar</p><h1 className="mt-2 text-3xl font-bold tracking-tight">My appointments</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Everything about your upcoming home services and previous visits, kept in one place.</p></div><Link to="/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-primary-deep hover:bg-fuchsia-50"><CalendarPlus className="h-4 w-4" />Book a service</Link></div></section>

      <div className="mb-6 inline-flex rounded-xl border border-purple-100 bg-white p-1 shadow-sm">
        <button 
          onClick={() => setFilter('upcoming')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === 'upcoming' ? 'bg-primary-purple text-white shadow-sm' : 'text-text-muted hover:bg-lavender'}`}
        >Upcoming</button>
        <button 
          onClick={() => setFilter('past')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${filter === 'past' ? 'bg-primary-purple text-white shadow-sm' : 'text-text-muted hover:bg-lavender'}`}
        >Past & Cancelled</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading appointments...</div>
      ) : appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-12 text-center shadow-sm"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-lavender text-primary-purple"><Calendar className="h-6 w-6" /></span>
          <h3 className="section-title">No appointments found</h3>
          <p className="mt-2 text-sm text-text-muted">You have no {filter} appointments.</p>{filter === 'upcoming' && <Link to="/book" className="btn-primary mt-6">Book your first service</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {appointments.map(app => (
            <article key={app.id} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md">
              <div className="flex items-center justify-between border-b border-purple-50 bg-gradient-to-r from-lavender/70 to-white p-4">
                <span className="text-xs font-mono font-bold text-text-muted">{app.appointment_number}</span>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={app.status} />
                  {app.payment_summary && <PaymentStatusBadge state={app.payment_summary.payment_state} />}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-purple text-white"><Scissors className="h-4 w-4" /></span><h3 className="font-bold text-lg text-text-primary mb-1">{app.service_name_snapshot}</h3>
                <p className="text-sm text-text-muted mb-4">with {app.staff?.profile?.display_name || app.staff?.name}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm font-medium text-text-primary">
                    <Calendar className="w-4 h-4 text-primary-purple mr-3 shrink-0" />
                    {formatDate(app.appointment_date)}
                  </div>
                  <div className="flex items-center text-sm font-medium text-text-primary">
                    <Clock className="w-4 h-4 text-primary-purple mr-3 shrink-0" />
                    {formatTime(app.start_time)} – {formatTime(app.end_time)}
                  </div>
                </div>

                <Link to={`/account/appointments/${app.id}`} className="mt-auto flex w-full items-center justify-between rounded-xl bg-lavender/65 px-4 py-3 text-sm font-bold text-primary-deep transition-colors group-hover:bg-lavender">
                  View appointment <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default CustomerAppointments;
