import React from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const NotFound = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <PublicHeader />
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center"><p className="text-sm font-semibold text-primary-deep">404</p><h1 className="page-title mt-2">Page not found</h1><p className="mt-3 text-text-muted">The page may have moved, or the address may be incorrect.</p><Link to="/" className="btn-primary mt-7">Return home</Link></div>
    </main>
    <PublicFooter />
  </div>
);
export default NotFound;
