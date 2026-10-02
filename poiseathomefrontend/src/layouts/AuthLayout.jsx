import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Scissors } from 'lucide-react';
import authImage from '../assets/poise-auth-welcome.png';
import BrandLogo from '../components/BrandLogo';

const AuthLayout = ({ title, description, children, wide = false }) => (
  <main className="min-h-screen bg-white lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
    <section className="relative hidden h-screen overflow-hidden bg-lavender lg:block">
      <img
        src={authImage}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-2xl"
      />
      <img
        src={authImage}
        alt="Poise hairstylist arriving for a home appointment"
        className="absolute inset-0 h-full w-full object-contain object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#211426]/90 via-transparent to-black/25" />
      <div className="relative flex h-full flex-col justify-between p-10 text-white xl:p-14">
        <Link to="/" aria-label="PoiseAtHome home" className="drop-shadow-sm"><BrandLogo inverse imageClassName="h-14 w-14" textClassName="text-2xl" /></Link>
        <div className="max-w-lg">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#211426]/35 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
            <Scissors className="h-4 w-4 text-fuchsia-200" /> Beauty, booked around you
          </div>
          <h2 className="text-3xl font-bold leading-tight tracking-tight drop-shadow-sm xl:text-4xl">Professional salon care, arriving at your door.</h2>
          <ul className="mt-5 space-y-2.5 text-sm text-white/95">
            {['Browse transparent service details', 'Choose an available qualified stylist', 'Track bookings and confirmations online'].map(item => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-fuchsia-400/30"><Check className="h-4 w-4" /></span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section className="min-h-screen bg-background px-4 sm:px-8 lg:h-screen lg:overflow-y-auto lg:px-12">
      <div className={`${wide ? 'max-w-xl' : 'max-w-md'} mx-auto w-full py-10 lg:flex lg:min-h-full lg:items-center lg:py-14`}>
        <div className="w-full lg:py-2">
          <Link to="/" aria-label="PoiseAtHome home" className="mb-8 block lg:hidden"><BrandLogo imageClassName="h-12 w-12" textClassName="text-xl" /></Link>
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-[.14em] text-primary-purple">Poise Hair Center Salon</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
            {description && <p className="mt-3 leading-7 text-text-muted">{description}</p>}
          </div>
          <div>{children}</div>
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5 text-xs text-text-muted">
            <span>Secure home-service booking</span>
            <Link to="/services" className="font-semibold text-primary-deep hover:underline">Browse services</Link>
          </div>
        </div>
      </div>
    </section>
  </main>
);

export default AuthLayout;
