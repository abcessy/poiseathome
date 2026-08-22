import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../../services/api';
import { ArrowRight, CalendarCheck, CalendarDays, CalendarOff, CheckCircle2, Clock3, Scissors, Sparkles, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatters';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [nextDayOff, setNextDayOff] = useState(null);
  const [report, setReport] = useState(null);
  const todayLabel = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profRes, daysRes, repRes] = await Promise.all([
          fetchApi('/staff/profile'),
          fetchApi('/staff/days-off'), fetchApi('/staff/reports/overview')
        ]);
        if (profRes.ok) {
          setProfile((await profRes.json()).data.profile);
        }
        if (repRes.ok) setReport((await repRes.json()).data);
        if (daysRes.ok) {
          const days = (await daysRes.json()).data;
          const today = new Date().toISOString().split('T')[0];
          const upcoming = days.filter(d => d.date >= today).sort((a,b) => a.date.localeCompare(b.date));
          if (upcoming.length > 0) setNextDayOff(upcoming[0].date);
        }
      } catch(e) {}
    };
    loadProfile();
  }, []);

  return (
    <DashboardLayout role="staff">
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-[#2d1835] px-6 py-7 text-white shadow-[0_18px_50px_rgba(88,28,135,.18)] sm:px-8 sm:py-9">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute bottom-0 right-[24%] h-24 w-24 rounded-full bg-purple-300/10 blur-xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-fuchsia-200"><Sparkles className="h-4 w-4" /> {todayLabel}</div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good day, {user?.name?.split(' ')[0]}.</h1>
              <p className="mt-3 max-w-xl leading-7 text-white/70">Your chair is ready. Keep an eye on today’s bookings and make every home appointment feel effortless.</p>
            </div>
            <Link to="/staff/appointments" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-primary-deep transition hover:bg-fuchsia-50">Open my schedule <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Appointments today', value: report?.appointments_today || 0, icon: CalendarCheck, tone: 'bg-purple-100 text-primary-deep' },
            { label: 'Coming up', value: report?.appointments_upcoming || 0, icon: Clock3, tone: 'bg-fuchsia-100 text-fuchsia-700' },
            { label: 'Completed in 30 days', value: report?.appointments_completed || 0, icon: CheckCircle2, tone: 'bg-emerald-100 text-emerald-700' },
            { label: 'Next day off', value: nextDayOff ? formatDate(nextDayOff) : 'Not set', icon: CalendarOff, tone: 'bg-amber-100 text-amber-700', compact: true },
          ].map((item, index) => {
            const Icon = item.icon;
            return <div key={item.label} className={`flex items-center gap-4 p-5 sm:p-6 ${index ? 'border-t border-purple-50 sm:border-l sm:border-t-0 xl:border-l' : ''} ${index === 2 ? 'sm:border-l-0 sm:border-t xl:border-l xl:border-t-0' : ''}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.tone}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className={`${item.compact ? 'text-lg' : 'text-2xl'} truncate font-bold text-text-primary`}>{item.value}</p><p className="mt-0.5 text-xs font-medium text-text-muted">{item.label}</p></div></div>;
          })}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,.75fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-purple">Today’s workspace</p><h2 className="mt-2 text-xl font-bold">What would you like to manage?</h2></div><Scissors className="h-6 w-6 text-fuchsia-400" /></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Link to="/staff/appointments" className="group relative overflow-hidden rounded-2xl border border-purple-100 bg-lavender/55 p-5 transition hover:-translate-y-0.5 hover:border-primary-accent hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-purple text-white"><CalendarDays className="h-5 w-5" /></span><h3 className="mt-5 font-bold text-primary-deep">Appointments</h3><p className="mt-1 text-sm leading-6 text-text-muted">Review customers, service details, and appointment progress.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary-purple">View schedule <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
              <Link to="/staff/availability" className="group relative overflow-hidden rounded-2xl border border-fuchsia-100 bg-fuchsia-50/50 p-5 transition hover:-translate-y-0.5 hover:border-fuchsia-400 hover:shadow-md"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-600 text-white"><Clock3 className="h-5 w-5" /></span><h3 className="mt-5 font-bold text-fuchsia-800">Availability</h3><p className="mt-1 text-sm leading-6 text-text-muted">Set your booking status and organize upcoming days off.</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-fuchsia-700">Manage time <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
            </div>
          </section>

          <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="h-1.5 bg-gradient-to-r from-primary-purple via-fuchsia-500 to-pink-400" />
            <div className="p-6 text-center">
              <div className="relative mx-auto h-24 w-24"><div className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl bg-lavender ring-4 ring-purple-50">{user?.avatar_path ? <img src={mediaUrl(user.avatar_path)} alt={`${user.name} profile`} className="h-full w-full object-cover" /> : <User className="h-11 w-11 text-primary-purple" />}</div><span className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white ${profile?.is_available ? 'bg-emerald-500' : 'bg-gray-400'}`} /></div>
              <h2 className="mt-5 text-xl font-bold">{profile?.display_name || user?.name}</h2>
              <p className="mt-1 text-sm leading-6 text-text-muted">{profile?.specialization || 'Complete your salon specialization'}</p>
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${profile?.is_available ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}><span className={`h-2 w-2 rounded-full ${profile?.is_available ? 'bg-emerald-500' : 'bg-gray-400'}`} />{profile?.is_available ? 'Open for bookings' : 'Not accepting bookings'}</div>
              <Link to="/profile" className="btn-outline mt-6 w-full">View my profile</Link>
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
