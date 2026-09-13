import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Check, Clock, Heart, Home as HomeIcon, MapPin, ShieldCheck, Sparkles, Star, Users } from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import heroImage from '../assets/poiseathomehero.jpg';
import benefitsImage from '../assets/poise-home-service-benefits.png';
import { fetchApi, mediaUrl } from '../services/api';
import { formatDuration, formatMoney } from '../utils/formatters';

const Home = () => {
  const [services, setServices] = useState([]);

  useEffect(() => {
    fetchApi('/services?home_service=true')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(data => setServices((data.data || []).slice(0, 6)))
      .catch(() => setServices([]));
  }, []);

  const steps = [
    { icon: Sparkles, title: 'Choose your service', copy: 'Browse clear prices, durations, and service details before you commit.' },
    { icon: Users, title: 'Select your stylist', copy: 'Pick from qualified Poise hairstylists who offer your chosen service.' },
    { icon: CalendarCheck, title: 'Set your schedule', copy: 'Choose an available date and time, then share your home-service address.' },
    { icon: Check, title: 'Confirm and relax', copy: 'Send your downpayment proof for review and follow your booking from your account.' },
  ];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <PublicHeader />
      <main>
        <section className="overflow-hidden border-b border-purple-100 bg-[#fcfaff]">
          <div className="grid min-h-[calc(100svh-4rem)] lg:grid-cols-[.82fr_1.18fr]">
            <div className="relative z-10 flex items-center px-4 py-16 sm:px-8 lg:px-[max(2rem,calc((100vw-80rem)/2))] lg:pr-12">
              <div className="max-w-xl">
                <div className="mb-7 h-1 w-16 bg-gradient-to-r from-primary-purple to-fuchsia-500" />
                <h1 className="text-5xl font-bold leading-[1.02] tracking-[-.045em] text-text-primary sm:text-6xl lg:text-7xl">Your salon moment, at home.</h1>
                <p className="mt-6 max-w-lg text-lg leading-8 text-text-muted sm:text-xl">Professional hair care without the salon commute. Choose your service, preferred hairstylist, and schedule—all in one simple booking.</p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/book" className="btn-primary min-h-12 px-6 text-base">Book an Appointment <ArrowRight className="h-4 w-4" /></Link><Link to="/services" className="btn-outline min-h-12 px-6 text-base">Explore Services</Link></div>
                <div className="mt-10 grid gap-3 border-t border-purple-100 pt-6 text-sm text-text-muted sm:grid-cols-3"><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-primary-purple" /> Secure booking</span><span className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-primary-purple" /> At your address</span><span className="flex items-center gap-2"><Star className="h-4 w-4 shrink-0 text-primary-purple" /> Qualified stylists</span></div>
              </div>
            </div>
            <div className="relative min-h-[26rem] lg:min-h-full">
              <img src={heroImage} alt="Poise Hair Center storefront and salon" className="absolute inset-0 h-full w-full object-cover object-[center_35%]" fetchPriority="high" />
              <div className="absolute inset-y-0 left-0 hidden w-24 bg-gradient-to-r from-[#fcfaff] to-transparent lg:block" />
              <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/60 bg-white/90 p-5 shadow-lg backdrop-blur-sm sm:left-auto sm:max-w-xs lg:bottom-10 lg:right-10"><p className="text-sm font-semibold text-primary-deep">Poise Hair Center</p><p className="mt-1 text-sm leading-6 text-text-muted">Browse, schedule, and enjoy authentic salon care at home.</p></div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-200 bg-white"><div className="mx-auto grid max-w-7xl divide-y divide-gray-200 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">{[
          ['Transparent service details', 'See prices and estimated durations before booking.'], ['Schedules that fit your day', 'Browse current stylist availability online.'], ['A salon team you can trust', 'Every service is handled by qualified Poise staff.'],
        ].map(([title, copy]) => <div key={title} className="py-7 sm:px-7 sm:first:pl-0 sm:last:pr-0"><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-text-muted">{copy}</p></div>)}</div></section>

        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-primary-purple">Our services</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Salon expertise, brought to your door</h2><p className="mt-4 text-lg leading-8 text-text-muted">Explore home-service options from the current Poise catalog, with clear pricing and timing.</p></div><Link to="/services" className="btn-outline shrink-0">View all services <ArrowRight className="h-4 w-4" /></Link></div>
          {services.length > 0 ? <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{services.map(service => <Link key={service.id} to={`/services/${service.slug}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition hover:-translate-y-1 hover:border-primary-purple/40 hover:shadow-lg"><div className="aspect-[16/10] overflow-hidden bg-lavender/50">{service.image_path ? <img src={mediaUrl(service.image_path)} alt={service.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Sparkles className="h-10 w-10 text-primary-purple/35" /></div>}</div><div className="p-5"><p className="text-sm font-medium text-primary-purple">{service.category?.name}</p><h3 className="mt-1 text-xl font-semibold">{service.name}</h3><div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4"><span className="flex items-center gap-2 text-sm text-text-muted"><Clock className="h-4 w-4" />{formatDuration(service.duration_minutes)}</span><span className="font-bold text-primary-deep">{formatMoney(service.price)}</span></div></div></Link>)}</div> : <div className="mt-10 rounded-xl border border-gray-200 bg-white p-8 text-center text-text-muted">Our current home-service menu is being updated. You can still begin a booking to check availability.</div>}
        </section>

        <section className="border-y border-purple-100 bg-lavender/55"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[.16em] text-primary-purple">How it works</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">From browsing to beautifully done</h2><p className="mt-4 text-lg text-text-muted">A clear booking flow designed around your time and comfort.</p></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{steps.map(({ icon: Icon, title, copy }, index) => <article key={title} className="rounded-xl border border-purple-100 bg-white p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-purple text-white"><Icon className="h-5 w-5" /></span><span className="text-3xl font-bold text-purple-100">0{index + 1}</span></div><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-text-muted">{copy}</p></article>)}</div></div></section>

        <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24"><div className="relative overflow-hidden rounded-xl bg-lavender"><img src={benefitsImage} alt="Client enjoying her freshly styled hair at home" className="aspect-[4/3] h-full w-full object-cover" loading="lazy" /></div><div><p className="text-sm font-bold uppercase tracking-[.16em] text-primary-purple">Why home service</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">More comfort. Less waiting. The same Poise care.</h2><p className="mt-5 text-lg leading-8 text-text-muted">Make time for your hair without rearranging your entire day. Your stylist arrives prepared for the service you selected.</p><ul className="mt-8 grid gap-5 sm:grid-cols-2">{[
          [HomeIcon, 'Your own space', 'Enjoy your appointment in a familiar, comfortable setting.'], [Clock, 'Time-conscious care', 'Know the expected duration before choosing your schedule.'], [Heart, 'Personal attention', 'A dedicated appointment focused on your selected service.'], [ShieldCheck, 'Clear confirmation', 'Review booking and payment status securely from your account.'],
        ].map(([Icon, title, copy]) => <li key={title} className="flex gap-3"><Icon className="mt-1 h-5 w-5 shrink-0 text-primary-purple" /><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-text-muted">{copy}</p></div></li>)}</ul></div></section>

        <section className="border-y border-gray-200 bg-white"><div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-primary-purple">Before your visit</p><h2 className="mt-3 text-3xl font-bold tracking-tight">A little preparation goes a long way</h2><p className="mt-4 leading-7 text-text-muted">We’ll collect the important address details during booking. On appointment day, these simple steps help your stylist get started smoothly.</p></div><div className="grid gap-4 sm:grid-cols-3">{[
          ['01', 'Choose a bright area', 'A well-lit space with enough room helps your stylist work comfortably.'], ['02', 'Keep an outlet nearby', 'Some services may require access to standard styling tools.'], ['03', 'Be ready on time', 'Have your hair and space ready based on any instructions shared with you.'],
        ].map(([number, title, copy]) => <div key={number} className="border-l-2 border-primary-purple pl-5"><p className="text-sm font-bold text-primary-purple">{number}</p><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-text-muted">{copy}</p></div>)}</div></div></div></section>

        <section className="px-4 py-20 sm:px-6 lg:py-24"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-xl bg-primary-deep px-6 py-14 text-center text-white sm:px-12 sm:py-16"><div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" /><div className="relative mx-auto max-w-2xl"><Sparkles className="mx-auto h-7 w-7 text-fuchsia-300" /><h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">Ready for salon care on your schedule?</h2><p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-purple-100">Create your account, choose your service, and find an available Poise hairstylist for your home appointment.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/book" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[.625rem] bg-white px-6 font-semibold text-primary-deep hover:bg-purple-50">Book an Appointment <ArrowRight className="h-4 w-4" /></Link><Link to="/services" className="inline-flex min-h-12 items-center justify-center rounded-[.625rem] border border-white/35 px-6 font-semibold text-white hover:bg-white/10">Browse Services</Link></div></div></div></section>
      </main>
      <PublicFooter />
    </div>
  );
};

export default Home;
