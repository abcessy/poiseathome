import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { fetchApi } from '../../services/api';
import AuthLayout from '../../layouts/AuthLayout';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '', contact_number: '', email: '', password: '', password_confirmation: '', terms_accepted: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = event => setFormData({
    ...formData,
    [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
  });

  const continueToSecurity = event => {
    event.preventDefault();
    setError('');
    if (!formData.name.trim() || !formData.email.trim() || !formData.contact_number.trim()) {
      setError('Complete your personal details to continue.');
      return;
    }
    const cleanPhone = formData.contact_number.trim().replace(/[\s-]/g, '');
    if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) {
      setError('Please enter a valid Philippine mobile number (e.g. 09123456789 or +639123456789).');
      return;
    }
    setStep(2);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (formData.password !== formData.password_confirmation) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.terms_accepted) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchApi('/auth/register', { method: 'POST', body: JSON.stringify(formData) });
      const data = await response.json();
      if (response.ok) {
        navigate('/verify-email', { state: { email: formData.email, password: formData.password } });
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, label: 'Your details', icon: UserRound },
    { number: 2, label: 'Security', icon: LockKeyhole },
  ];

  return (
    <AuthLayout wide title="Create your account" description="Set up your customer account in two quick steps. You can add your home-service address later from your dashboard.">
      <ol className="mb-8 grid grid-cols-2 gap-3" aria-label="Registration progress">
        {steps.map(item => {
          const Icon = item.icon;
          const complete = step > item.number;
          const active = step === item.number;
          return (
            <li key={item.number} aria-current={active ? 'step' : undefined} className={`rounded-xl border p-4 ${active ? 'border-primary-purple bg-lavender/60' : complete ? 'border-purple-200 bg-white' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-primary-purple text-white' : complete ? 'bg-lavender text-primary-deep' : 'bg-gray-100 text-gray-500'}`}>{complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span>
                <div><p className="text-xs font-semibold text-text-muted">Step {item.number}</p><p className="text-sm font-semibold">{item.label}</p></div>
              </div>
            </li>
          );
        })}
      </ol>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === 1 ? (
        <form onSubmit={continueToSecurity} className="space-y-5">
          <div><label htmlFor="register-name" className="mb-1 block text-sm font-medium">Full name</label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="register-name" type="text" name="name" value={formData.name} onChange={handleChange} autoComplete="name" required className="h-11 w-full pl-10 pr-3" placeholder="Your full name" /></div></div>
          <div><label htmlFor="register-email" className="mb-1 block text-sm font-medium">Email address</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="register-email" type="email" name="email" value={formData.email} onChange={handleChange} autoComplete="email" required className="h-11 w-full pl-10 pr-3" placeholder="you@example.com" /></div></div>
          <div><label htmlFor="register-phone" className="mb-1 block text-sm font-medium">Contact number</label><div className="relative"><Phone className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="register-phone" type="tel" name="contact_number" value={formData.contact_number} onChange={handleChange} autoComplete="tel" required className="h-11 w-full pl-10 pr-3" placeholder="09XX XXX XXXX" /></div></div>
          <button type="submit" className="btn-primary w-full">Continue to security <ArrowRight className="h-4 w-4" /></button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div><label htmlFor="register-password" className="mb-1 block text-sm font-medium">Password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="register-password" type="password" name="password" value={formData.password} onChange={handleChange} autoComplete="new-password" required minLength={8} className="h-11 w-full pl-10 pr-3" placeholder="At least 8 characters" /></div></div>
          <div><label htmlFor="register-password-confirmation" className="mb-1 block text-sm font-medium">Confirm password</label><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="register-password-confirmation" type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleChange} autoComplete="new-password" required minLength={8} className="h-11 w-full pl-10 pr-3" placeholder="Repeat your password" /></div></div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-6 text-text-muted">
            <input type="checkbox" name="terms_accepted" checked={formData.terms_accepted} onChange={handleChange} required className="mt-1 h-4 w-4 shrink-0 accent-primary-purple" />
            <span>I agree to the <Link to="/terms" target="_blank" className="font-semibold text-primary-deep hover:underline">Terms of Service</Link> and acknowledge the <Link to="/privacy" target="_blank" className="font-semibold text-primary-deep hover:underline">Privacy Policy</Link>.</span>
          </label>
          <div className="flex gap-3"><button type="button" onClick={() => { setError(''); setStep(1); }} className="btn-outline flex-1"><ArrowLeft className="h-4 w-4" /> Back</button><button type="submit" disabled={loading} className="btn-primary flex-[1.5]">{loading ? 'Creating account…' : 'Create account'}</button></div>
        </form>
      )}

      <p className="mt-6 text-center text-text-muted">Already have an account? <Link to="/login" className="font-semibold text-primary-deep hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
};

export default Register;
