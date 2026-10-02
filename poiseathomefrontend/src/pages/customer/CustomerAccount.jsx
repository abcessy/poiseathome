import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layouts/DashboardLayout';
import { ArrowRight, CheckCircle, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';

const CustomerAccount = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout role="customer">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#33183b] to-primary-deep px-6 py-8 text-white sm:px-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-fuchsia-200">Customer account</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Your booking identity</h1><p className="mt-2 max-w-xl text-sm leading-6 text-white/70">Keep your contact information current so appointment updates always reach you.</p></div><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><UserRound className="h-6 w-6" /></span></div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-purple-100 bg-lavender/35 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-wider text-primary-purple">Account holder</p><h2 className="mt-1 text-xl font-bold text-text-primary">{user?.name}</h2></div>
            <div>
              {user?.email_verified_at ? (
                <span className="inline-flex items-center text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Verified account
                </span>
              ) : (
                <span className="inline-flex items-center text-sm font-medium text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
                  Unverified
                </span>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <h3 className="section-title mb-5">Contact information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gray-100 bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-purple shadow-sm"><Mail className="h-4 w-4" /></span><p className="mt-4 text-xs font-semibold text-text-muted">Email address</p><p className="mt-1 break-all font-semibold text-text-primary">{user?.email}</p></div>
              <div className="rounded-xl border border-gray-100 bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-primary-purple shadow-sm"><Phone className="h-4 w-4" /></span><p className="mt-4 text-xs font-semibold text-text-muted">Contact number</p><p className="mt-1 font-semibold text-text-primary">{user?.contact_number || 'Not provided'}</p></div>
            </div>
            <Link to="/profile" className="btn-outline mt-6">Edit personal details <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
        <aside className="space-y-4">
          <Link to="/account/address" className="group block rounded-2xl border border-fuchsia-100 bg-fuchsia-50/55 p-5 transition hover:border-fuchsia-300 hover:shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-fuchsia-600 text-white"><MapPin className="h-5 w-5" /></span><h2 className="mt-5 font-bold">Home-service address</h2><p className="mt-2 text-sm leading-6 text-text-muted">{user?.address ? 'Your saved location is ready for faster booking.' : 'Add a location for faster appointment booking.'}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-fuchsia-700">Manage address <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
          <div className="rounded-2xl border border-purple-100 bg-lavender/45 p-5">
            <ShieldCheck className="h-5 w-5 text-primary-purple" />
            <h3 className="mt-3 font-bold">Private and secure</h3>
            <p className="mt-1 text-sm leading-6 text-text-muted">Your contact details are used only for your account and service coordination.</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-primary-deep font-bold text-sm">
              <Phone className="h-4 w-4 text-primary-purple" />
              <span>Salon Administrator Support</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-text-muted">
              For payment inquiries, schedule adjustments, or service questions:
            </p>
            <div className="mt-3 space-y-1.5 text-xs">
              <p><span className="font-semibold text-text-primary">Hotline:</span> <a href="tel:+639171234567" className="font-bold text-primary-deep hover:underline">+63 917 123 4567</a> / (02) 8123-4567</p>
              <p><span className="font-semibold text-text-primary">Email:</span> <a href="mailto:support@poiseathome.com" className="font-bold text-primary-deep hover:underline">support@poiseathome.com</a></p>
              <p className="text-[11px] text-text-muted">Hours: Mon – Sun, 8:00 AM – 7:00 PM</p>
            </div>
          </div>
        </aside>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerAccount;
