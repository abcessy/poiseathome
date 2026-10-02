import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import { fetchApi } from '../../services/api';

const genericMessage = "If an account exists for this email, we've sent a password reset code.";

const ForgotPassword = () => {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [authorization, setAuthorization] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async ({ resend = false } = {}) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetchApi('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'We could not process your request. Please try again.');
        return;
      }

      setCode('');
      setAuthorization('');
      setStep('code');
      setMessage(resend ? 'A new reset code has been requested.' : genericMessage);
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();
    await requestCode();
  };

  const handleCodeSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetchApi('/auth/forgot-password/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'The reset code is invalid or expired.');
        return;
      }

      setAuthorization(data.data.reset_authorization);
      setCode('');
      setStep('password');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetchApi('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email,
          reset_authorization: authorization,
          password,
          password_confirmation: passwordConfirmation,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.errors?.password?.[0] || data.message || 'Your password could not be reset.');
        return;
      }

      setAuthorization('');
      setPassword('');
      setPasswordConfirmation('');
      setStep('success');
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <AuthLayout title="Password reset complete" description="Your password has been reset.">
        <Link to="/login" className="btn-primary w-full">Return to sign in</Link>
      </AuthLayout>
    );
  }

  const title = step === 'email' ? 'Forgot your password?' : step === 'code' ? 'Enter your reset code' : 'Choose a new password';
  const description = step === 'email'
    ? 'Enter your account email and we’ll send instructions if an account exists.'
    : step === 'code'
      ? `Enter the six-digit code sent to ${email}.`
      : 'Use at least eight characters for your new password.';

  return (
    <AuthLayout title={title} description={description}>
      {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-email" className="mb-1 block text-sm font-medium">Email address</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="h-11 w-full border px-3" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Sending…' : 'Send reset code'}</button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={handleCodeSubmit} className="space-y-5">
          <div>
            <label htmlFor="reset-code" className="mb-1 block text-sm font-medium">Reset code</label>
            <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength="6" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} placeholder="000000" className="w-full border px-4 py-3 text-center text-2xl tracking-widest" />
          </div>
          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">{loading ? 'Checking…' : 'Continue'}</button>
          <button type="button" disabled={loading} onClick={() => requestCode({ resend: true })} className="btn-ghost w-full">Request a new code</button>
        </form>
      )}

      {step === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-11 w-full border px-3" />
          </div>
          <div>
            <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium">Confirm new password</label>
            <input id="confirm-new-password" type="password" autoComplete="new-password" minLength="8" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="h-11 w-full border px-3" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Resetting…' : 'Reset password'}</button>
        </form>
      )}

      <p className="mt-6 text-center text-sm"><Link to="/login" className="font-semibold text-primary-deep hover:underline">Back to sign in</Link></p>
    </AuthLayout>
  );
};

export default ForgotPassword;
