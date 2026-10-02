import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const email = location.state?.email || '';
  const password = location.state?.password || '';

  if (!email) {
    return <AuthLayout title="Verification link unavailable"><p className="text-sm text-red-700">Return to <a className="font-semibold underline" href="/login">sign in</a> and try again.</p></AuthLayout>;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await fetchApi('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (password) {
          await login(email, password);
          navigate('/');
        } else {
          setMessage('Verified! You can now log in.');
          setTimeout(() => navigate('/login'), 2000);
        }
      } else {
        setError(data.message || 'Verification failed');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setMessage('');
    setError('');
    setResending(true);
    try {
      const response = await fetchApi('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Verification code resent.');
      } else {
        setError(data.message || 'Failed to resend');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout title="Verify your email" description={<>Enter the six-digit code sent to <strong>{email}</strong>.</>}>
        
        {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
        
        <form onSubmit={handleVerify} className="space-y-4">
          <label htmlFor="verification-code" className="block text-left text-sm font-medium">Verification code</label>
          <input id="verification-code" inputMode="numeric" autoComplete="one-time-code" type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} maxLength="6" required 
                 placeholder="000000" className="w-full text-center text-2xl tracking-widest px-4 py-3 border rounded-lg focus:ring-primary-purple focus:border-primary-purple" />
          <button type="submit" disabled={loading || code.length !== 6} className="btn-primary w-full">
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>
        
        <button onClick={handleResend} disabled={resending || loading} className="mt-6 text-sm text-text-muted hover:text-primary-accent underline disabled:cursor-not-allowed disabled:opacity-50">
          {resending ? 'Requesting a new code…' : "Didn't receive a code? Resend"}
        </button>
    </AuthLayout>
  );
};

export default VerifyEmail;
