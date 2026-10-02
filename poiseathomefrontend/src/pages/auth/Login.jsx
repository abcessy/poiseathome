import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      navigate('/');
    } else {
      if (result.message === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', { state: { email } });
      } else {
        setError(result.message || 'We could not sign you in. Check your email and password.');
      }
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Sign in" description="Access your PoiseAtHome account and appointments.">
          {error && <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required 
                     className="h-11 w-full border px-3" />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-4">
                <label htmlFor="login-password" className="block text-sm font-medium text-text-primary">Password</label>
                <Link to="/forgot-password" className="text-sm font-medium text-primary-deep hover:underline">Forgot password?</Link>
              </div>
              <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                     className="h-11 w-full border px-3" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          
          <p className="mt-6 text-center text-text-muted">
            Don&apos;t have an account? <Link to="/register" className="font-semibold text-primary-deep hover:underline">Create account</Link>
          </p>
    </AuthLayout>
  );
};

export default Login;
