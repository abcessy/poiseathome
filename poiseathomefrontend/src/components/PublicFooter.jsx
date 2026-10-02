import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const PublicFooter = () => (
  <footer className="border-t border-gray-200 bg-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
      <div className="max-w-sm"><Link to="/" aria-label="PoiseAtHome home"><BrandLogo imageClassName="h-12 w-12" textClassName="text-xl" /></Link><p className="mt-3 text-sm leading-6 text-text-muted">Professional Poise Hair Center Salon services, scheduled online and brought to the comfort of your home.</p></div>
      <div><h2 className="text-sm font-semibold">Explore</h2><div className="mt-3 flex flex-col gap-2 text-sm text-text-muted"><Link to="/services" className="hover:text-primary-deep">Salon services</Link><Link to="/reviews" className="hover:text-primary-deep">Customer reviews</Link><Link to="/book" className="hover:text-primary-deep">Book an appointment</Link></div></div>
      <div><h2 className="text-sm font-semibold">Your account</h2><div className="mt-3 flex flex-col gap-2 text-sm text-text-muted"><Link to="/login" className="hover:text-primary-deep">Sign in</Link><Link to="/register" className="hover:text-primary-deep">Create account</Link></div></div>
      <div><h2 className="text-sm font-semibold">Legal</h2><div className="mt-3 flex flex-col gap-2 text-sm text-text-muted"><Link to="/terms" className="hover:text-primary-deep">Terms of Service</Link><Link to="/privacy" className="hover:text-primary-deep">Privacy Policy</Link></div></div>
    </div>
    <div className="border-t border-gray-100"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span>© {new Date().getFullYear()} Poise Hair Center Salon. Home-service booking made simple.</span><span className="flex gap-4"><Link to="/terms" className="hover:text-primary-deep">Terms</Link><Link to="/privacy" className="hover:text-primary-deep">Privacy</Link></span></div></div>
  </footer>
);

export default PublicFooter;
