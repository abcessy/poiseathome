import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './notifications/NotificationBell';
import BrandLogo from './BrandLogo';

const PublicHeader = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const accountPath = user?.role === 'customer' ? '/account' : user ? `/${user.role}` : '/login';
  const close = () => setOpen(false);
  const navClass = (path) => `text-sm font-medium ${location.pathname === path ? 'text-primary-deep' : 'text-text-muted hover:text-text-primary'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="PoiseAtHome home" onClick={close}>
          <BrandLogo imageClassName="h-11 w-11" textClassName="text-xl" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Main navigation">
          <Link to="/" className={navClass('/')}>Home</Link>
          <Link to="/services" className={navClass('/services')}>Services</Link>
          <Link to="/reviews" className={navClass('/reviews')}>Reviews</Link>
          {user?.role === 'customer' && <Link to="/book" className="btn-primary">Book an Appointment</Link>}
          {!user && <Link to="/login" className={navClass('/login')}>Sign in</Link>}
          {!user && <Link to="/register" className="btn-primary">Create account</Link>}
          {user && <Link to={accountPath} className={navClass(accountPath)}>{user.role === 'customer' ? 'My account' : 'Dashboard'}</Link>}
          {user && <NotificationBell />}
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          {user && <NotificationBell />}
          <button className="btn-ghost min-h-10 px-2" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls="mobile-navigation">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-navigation" className="border-t border-gray-200 bg-white px-4 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            <Link to="/" onClick={close} className="btn-ghost justify-start">Home</Link>
            <Link to="/services" onClick={close} className="btn-ghost justify-start">Services</Link>
            <Link to="/reviews" onClick={close} className="btn-ghost justify-start">Reviews</Link>
            {user?.role === 'customer' && <Link to="/book" onClick={close} className="btn-primary mt-2">Book an Appointment</Link>}
            {user ? <Link to={accountPath} onClick={close} className="btn-outline mt-2">{user.role === 'customer' ? 'My account' : 'Dashboard'}</Link> : (
              <div className="mt-2 grid grid-cols-2 gap-2"><Link to="/login" onClick={close} className="btn-outline">Sign in</Link><Link to="/register" onClick={close} className="btn-primary">Create account</Link></div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default PublicHeader;
