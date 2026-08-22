import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BarChart, Box, Calendar, ChevronDown, Clock, Home, LogOut, MapPin, Menu, Package, Scissors, Star, Tag, User, Users, X } from 'lucide-react';
import NotificationBell from '../components/notifications/NotificationBell';
import { mediaUrl } from '../services/api';
import BrandLogo from '../components/BrandLogo';

const DashboardLayout = ({ children, role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const adminGroups = [
    { label: null, links: [{ label: 'Overview', to: '/admin', icon: Home }] },
    { label: 'Appointments', links: [{ label: 'Appointments', to: '/admin/appointments', icon: Calendar }, { label: 'Payment Reviews', to: '/admin/payments', icon: Tag }] },
    { label: 'Salon', links: [{ label: 'Services', to: '/admin/services', icon: Scissors }, { label: 'Service Categories', to: '/admin/service-categories', icon: Tag }, { label: 'Staff', to: '/admin/staff', icon: Users }] },
    { label: 'Inventory', links: [{ label: 'Product Inventory', to: '/admin/inventory', icon: Package }, { label: 'Products', to: '/admin/products', icon: Box }, { label: 'Product Categories', to: '/admin/product-categories', icon: Tag }] },
    { label: null, links: [{ label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart }] },
  ];
  const staffGroups = [
    { label: null, links: [{ label: 'Today', to: '/staff', icon: Home }, { label: 'My Schedule', to: '/staff/appointments', icon: Calendar }] },
    { label: 'Work', links: [{ label: 'My Services', to: '/staff/services', icon: Scissors }, { label: 'Inventory', to: '/staff/inventory', icon: Package }, { label: 'My Reports', to: '/staff/reports', icon: BarChart }] },
    { label: 'Account', links: [{ label: 'Availability & Days Off', to: '/staff/availability', icon: Clock }] },
  ];
  const customerGroups = [{ label: null, links: [{ label: 'My Appointments', to: '/account/appointments', icon: Calendar }, { label: 'My Address', to: '/account/address', icon: MapPin }, { label: 'Account Details', to: '/account', icon: User }, { label: 'Rate Us', to: '/reviews', icon: Star }] }];
  const groups = role === 'admin' ? adminGroups : role === 'staff' ? staffGroups : customerGroups;

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
        <Link to="/" aria-label="PoiseAtHome home"><BrandLogo imageClassName="h-10 w-10" textClassName="text-lg" /></Link>
        <button className="btn-ghost min-h-9 px-2 md:hidden" onClick={() => setDrawerOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label={`${role} navigation`}>
        {groups.map((group, index) => (
          <div key={index} className={index ? 'mt-5' : ''}>
            {group.label && <p className="mb-1 px-3 text-xs font-semibold text-gray-500">{group.label}</p>}
            <div className="space-y-1">
              {group.links.map(link => {
                const Icon = link.icon;
                const root = link.to === `/${role}` || (role === 'customer' && link.to === '/account');
                const active = root ? location.pathname === link.to : location.pathname.startsWith(link.to);
                return <Link key={link.to} to={link.to} onClick={() => setDrawerOpen(false)} className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active ? 'bg-lavender text-primary-deep' : 'text-text-muted hover:bg-gray-50 hover:text-text-primary'}`}><Icon className="h-4 w-4" />{link.label}</Link>;
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">{sidebar}</aside>
      {drawerOpen && <div className="fixed inset-0 z-50 md:hidden"><button className="absolute inset-0 bg-black/35" onClick={() => setDrawerOpen(false)} aria-label="Close navigation overlay" /><aside className="relative flex h-full w-[min(82vw,18rem)] flex-col bg-white shadow-lg">{sidebar}</aside></div>}
      <div className="min-w-0 flex-1 md:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <button className="btn-ghost min-h-10 px-2 md:hidden" onClick={() => setDrawerOpen(true)} aria-label="Open navigation" aria-expanded={drawerOpen}><Menu className="h-5 w-5" /></button>
          <p className="hidden text-sm font-medium capitalize text-text-muted md:block">{role} portal</p>
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
            <div className="relative">
              <button onClick={() => setAccountOpen(value => !value)} className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-1.5 text-left hover:border-purple-100 hover:bg-lavender/35" aria-expanded={accountOpen}>
                {user?.avatar_path ? <img src={mediaUrl(user.avatar_path)} alt={`${user.name} profile`} className="h-9 w-9 shrink-0 rounded-xl border border-purple-100 object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-purple to-primary-deep font-bold text-white shadow-sm">{user?.name?.charAt(0)}</span>}
                <span className="hidden min-w-0 sm:block"><span className="block max-w-48 truncate text-sm font-semibold">{user?.name}</span><span className="block max-w-48 truncate text-xs text-text-muted">{user?.email}</span></span>
                <ChevronDown className="hidden h-4 w-4 text-text-muted sm:block" />
              </button>
              {accountOpen && <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                <div className="border-b border-gray-100 px-3 py-2 sm:hidden"><p className="truncate text-sm font-semibold">{user?.name}</p><p className="truncate text-xs text-text-muted">{user?.email}</p></div>
                <Link to="/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-lavender/50"><User className="h-4 w-4 text-primary-purple" />My profile</Link>
                <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button>
              </div>}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 md:px-8 md:py-8"><div className="mx-auto max-w-7xl">{children}</div></main>
      </div>
    </div>
  );
};

export default DashboardLayout;
