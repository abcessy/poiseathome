import React, { useEffect, useRef, useState } from 'react';
import { AtSign, BriefcaseBusiness, Camera, Check, KeyRound, LockKeyhole, Mail, Phone, Send, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../services/api';

const AccountProfile = () => {
  const { user, checkUser, logout } = useAuth();
  const avatarInputRef = useRef(null);
  const [form, setForm] = useState(() => ({ name: user?.name || '', contact_number: user?.contact_number || '' }));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordMethod, setPasswordMethod] = useState('current');
  const [emailStep, setEmailStep] = useState('request');
  const [emailCode, setEmailCode] = useState('');
  const [resetAuthorization, setResetAuthorization] = useState('');
  const [emailPassword, setEmailPassword] = useState({ password: '', password_confirmation: '' });
  const [emailBusy, setEmailBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [staffProfile, setStaffProfile] = useState({ display_name: '', specialization: '', bio: '' });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffMessage, setStaffMessage] = useState('');
  const [staffError, setStaffError] = useState('');

  useEffect(() => {
    if (user?.role !== 'staff') return;

    const loadStaffProfile = async () => {
      try {
        const response = await fetchApi('/staff/profile');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Professional details could not be loaded.');
        const profile = payload.data.profile || {};
        setStaffProfile({
          display_name: profile.display_name || user.name || '',
          specialization: profile.specialization || '',
          bio: profile.bio || '',
        });
      } catch (exception) {
        setStaffError(exception.message);
      }
    };

    loadStaffProfile();
  }, [user?.role, user?.name]);

  const submit = async event => {
    event.preventDefault();
    setMessage(''); setError('');

    if (form.contact_number && form.contact_number.trim()) {
      const cleanPhone = form.contact_number.trim().replace(/[\s-]/g, '');
      if (!/^(09\d{9}|\+639\d{9})$/.test(cleanPhone)) {
        setError('Please enter a valid Philippine mobile number (e.g. 09123456789 or +639123456789).');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetchApi('/account/profile', { method: 'PATCH', body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Profile could not be updated.');
      await checkUser();
      setStaffProfile(prev => ({
        ...prev,
        display_name: form.name,
      }));
      setMessage('Your personal details are up to date.');
    } catch (exception) { setError(exception.message); }
    finally { setSaving(false); }
  };

  const changePassword = async event => {
    event.preventDefault();
    setPasswordSaving(true); setPasswordMessage(''); setPasswordError('');
    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError('New password confirmation does not match.'); setPasswordSaving(false); return;
    }
    try {
      const response = await fetchApi('/account/password', { method: 'PATCH', body: JSON.stringify(passwordForm) });
      const payload = await response.json();
      if (!response.ok) {
        const firstError = Object.values(payload.errors || {})[0]?.[0];
        throw new Error(firstError || payload.message || 'Password could not be updated.');
      }
      setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
      setPasswordMessage('Your password has been changed securely.');
    } catch (exception) { setPasswordError(exception.message); }
    finally { setPasswordSaving(false); }
  };

  const submitStaffProfile = async event => {
    event.preventDefault();
    setStaffSaving(true); setStaffMessage(''); setStaffError('');
    try {
      const response = await fetchApi('/staff/profile', { method: 'POST', body: JSON.stringify(staffProfile) });
      const payload = await response.json();
      if (!response.ok) {
        const firstError = Object.values(payload.errors || {})[0]?.[0];
        throw new Error(firstError || payload.message || 'Professional details could not be updated.');
      }
      await checkUser();
      setStaffMessage('Your professional details are up to date.');
    } catch (exception) { setStaffError(exception.message); }
    finally { setStaffSaving(false); }
  };

  const uploadAvatar = async file => {
    if (!file) return;
    setMessage(''); setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP profile image up to 3 MB.'); return;
    }
    const body = new FormData(); body.append('avatar', file);
    setAvatarBusy(true);
    try {
      const response = await fetchApi('/account/avatar', { method: 'POST', body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'Profile photo could not be updated.');
      await checkUser(); setMessage('Profile photo updated successfully.');
    } catch (exception) { setError(exception.message); }
    finally { setAvatarBusy(false); if (avatarInputRef.current) avatarInputRef.current.value = ''; }
  };

  const sendEmailCode = async () => {
    setEmailBusy(true); setPasswordError(''); setPasswordMessage('');
    try {
      const response = await fetchApi('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: user.email }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'The code could not be sent.');
      setEmailStep('code'); setEmailCode(''); setResetAuthorization('');
      setPasswordMessage(`A six-digit code was sent to ${user.email}.`);
    } catch (exception) { setPasswordError(exception.message); }
    finally { setEmailBusy(false); }
  };

  const verifyEmailCode = async event => {
    event.preventDefault(); setEmailBusy(true); setPasswordError(''); setPasswordMessage('');
    try {
      const response = await fetchApi('/auth/forgot-password/verify', { method: 'POST', body: JSON.stringify({ email: user.email, code: emailCode }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || 'The code is invalid or expired.');
      setResetAuthorization(payload.data.reset_authorization); setEmailStep('password');
    } catch (exception) { setPasswordError(exception.message); }
    finally { setEmailBusy(false); }
  };

  const changePasswordWithCode = async event => {
    event.preventDefault(); setEmailBusy(true); setPasswordError(''); setPasswordMessage('');
    if (emailPassword.password !== emailPassword.password_confirmation) { setPasswordError('New password confirmation does not match.'); setEmailBusy(false); return; }
    try {
      const response = await fetchApi('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email: user.email, reset_authorization: resetAuthorization, ...emailPassword }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.errors?.password?.[0] || payload.message || 'Password could not be updated.');
      await logout();
      window.location.assign('/login');
    } catch (exception) { setPasswordError(exception.message); setEmailBusy(false); }
  };

  return <DashboardLayout role={user?.role}>
    <div className="mx-auto max-w-5xl">
      <div className="mb-8"><p className="text-sm font-bold uppercase tracking-[.14em] text-primary-purple">Personal settings</p><h1 className="page-title mt-2">My profile</h1><p className="mt-2 text-text-muted">Keep the contact details used for your account and service updates accurate.</p></div>
      <div className="form-surface grid rounded-2xl lg:grid-cols-[18rem_1fr]">
        <aside className="relative overflow-hidden bg-[#29172f] p-7 text-white">
          <div className="absolute -right-16 -top-14 h-44 w-44 rounded-full bg-fuchsia-500/25 blur-2xl" />
          <div className="relative"><div className="relative w-fit">{user?.avatar_path ? <img src={mediaUrl(user.avatar_path)} alt={`${user.name} profile`} className="h-24 w-24 rounded-2xl border border-white/25 object-cover" /> : <span className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/15 text-3xl font-bold ring-1 ring-white/20">{user?.name?.charAt(0)}</span>}<button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy} className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl bg-fuchsia-500 text-white shadow-lg hover:bg-fuchsia-600" aria-label="Change profile photo"><Camera className="h-4 w-4" /></button><input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => uploadAvatar(event.target.files?.[0])} className="hidden" /></div><p className="mt-4 text-xs font-medium text-fuchsia-100">{avatarBusy ? 'Uploading photo…' : 'JPG, PNG or WebP · up to 3 MB'}</p><h2 className="mt-5 text-xl font-bold">{user?.name}</h2><p className="mt-1 break-all text-sm text-white/70">{user?.email}</p><span className="mt-5 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold capitalize ring-1 ring-white/15">{user?.role} account</span></div>
          <div className="relative mt-12 border-t border-white/15 pt-5 text-sm text-white/70"><ShieldCheck className="mb-2 h-5 w-5 text-fuchsia-200" /><p>Your email is your secure sign-in identity and cannot be changed here.</p></div>
        </aside>
        <form onSubmit={submit} className="p-6 sm:p-8 lg:p-10">
          <div className="mb-7"><h2 className="text-xl font-bold">Account information</h2><p className="mt-1 text-sm text-text-muted">Changes appear in the dashboard header immediately.</p></div>
          {message && <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4" />{message}</div>}
          {error && <div className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="profile-name" className="mb-1 block text-sm font-medium">Full name</label><div className="relative"><UserRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="profile-name" required value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="h-11 w-full pl-10 pr-3" /></div></div>
            <div><label htmlFor="profile-phone" className="mb-1 block text-sm font-medium">Contact number</label><div className="relative"><Phone className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="profile-phone" value={form.contact_number} onChange={event => setForm({ ...form, contact_number: event.target.value })} className="h-11 w-full pl-10 pr-3" placeholder="09XX XXX XXXX" /></div></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium">Email address</label><div className="relative"><AtSign className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input value={user?.email || ''} readOnly className="h-11 w-full bg-gray-50 pl-10 pr-3 text-text-muted" /></div><p className="mt-2 text-xs text-text-muted">Contact the administrator at <a href="mailto:support@poiseathome.com" className="font-semibold text-primary-deep hover:underline">support@poiseathome.com</a> or <a href="tel:+639171234567" className="font-semibold text-primary-deep hover:underline">+63 917 123 4567</a> if your sign-in email needs to be corrected.</p></div>
          </div>
          <div className="mt-8 flex justify-end border-t border-gray-100 pt-6"><button disabled={saving} className="btn-primary min-w-36">{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </div>
      {user?.role === 'staff' && <div className="form-surface mt-7 grid rounded-2xl lg:grid-cols-[18rem_1fr]">
        <aside className="relative overflow-hidden bg-gradient-to-br from-primary-deep to-fuchsia-700 p-7 text-white">
          <div className="absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-white/10" />
          <div className="relative"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20"><BriefcaseBusiness className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-bold">Salon profile</h2><p className="mt-2 text-sm leading-6 text-fuchsia-100">These details help customers understand your expertise when choosing a stylist.</p><div className="mt-6 flex items-center gap-2 text-xs font-semibold text-white/80"><Sparkles className="h-4 w-4" /> Visible to customers</div></div>
        </aside>
        <form onSubmit={submitStaffProfile} className="p-6 sm:p-8 lg:p-10">
          <div className="mb-7"><h2 className="text-xl font-bold">Professional information</h2><p className="mt-1 text-sm text-text-muted">Add the information customers need before booking your services.</p></div>
          {staffMessage && <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4" />{staffMessage}</div>}
          {staffError && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{staffError}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="staff-display-name" className="mb-1 block text-sm font-medium">Customer-facing name</label><input id="staff-display-name" required maxLength={255} value={staffProfile.display_name} onChange={event => setStaffProfile({ ...staffProfile, display_name: event.target.value })} className="h-11 w-full px-3" placeholder="e.g. Maria Santos" /></div>
            <div><label htmlFor="staff-specialization" className="mb-1 block text-sm font-medium">Specialization</label><input id="staff-specialization" required maxLength={255} value={staffProfile.specialization} onChange={event => setStaffProfile({ ...staffProfile, specialization: event.target.value })} className="h-11 w-full px-3" placeholder="e.g. Senior Colorist" /></div>
            <div className="sm:col-span-2"><label htmlFor="staff-bio" className="mb-1 block text-sm font-medium">Professional bio</label><textarea id="staff-bio" required maxLength={1000} rows={5} value={staffProfile.bio} onChange={event => setStaffProfile({ ...staffProfile, bio: event.target.value })} className="w-full px-3 py-3" placeholder="Share your experience, approach, and areas of expertise." /><p className="mt-2 text-right text-xs text-text-muted">{staffProfile.bio.length}/1000</p></div>
          </div>
          <div className="mt-8 flex justify-end border-t border-purple-100 pt-6"><button disabled={staffSaving} className="btn-primary min-w-44">{staffSaving ? 'Saving…' : 'Save salon profile'}</button></div>
        </form>
      </div>}
      <div className="form-surface mt-7 grid rounded-2xl lg:grid-cols-[18rem_1fr]">
        <aside className="bg-lavender/70 p-7"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-purple text-white"><KeyRound className="h-5 w-5" /></span><h2 className="mt-5 text-lg font-bold">Change password</h2><p className="mt-2 text-sm leading-6 text-text-muted">Confirm with your current password or request a secure six-digit code through email.</p></aside>
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-lavender/60 p-1"><button type="button" onClick={() => { setPasswordMethod('current'); setPasswordError(''); setPasswordMessage(''); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${passwordMethod === 'current' ? 'bg-white text-primary-deep shadow-sm' : 'text-text-muted'}`}>Current password</button><button type="button" onClick={() => { setPasswordMethod('code'); setPasswordError(''); setPasswordMessage(''); }} className={`rounded-lg px-3 py-2.5 text-sm font-semibold ${passwordMethod === 'code' ? 'bg-white text-primary-deep shadow-sm' : 'text-text-muted'}`}>Email code</button></div>
          {passwordMessage && <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700"><Check className="h-4 w-4" />{passwordMessage}</div>}
          {passwordError && <div role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">{passwordError}</div>}
          {passwordMethod === 'current' ? <form onSubmit={changePassword}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><label htmlFor="current-password" className="mb-1 block text-sm font-medium">Current password</label><div className="relative"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="current-password" type="password" autoComplete="current-password" required value={passwordForm.current_password} onChange={event => setPasswordForm({ ...passwordForm, current_password: event.target.value })} className="h-11 w-full pl-10 pr-3" /></div></div>
            <div><label htmlFor="new-password" className="mb-1 block text-sm font-medium">New password</label><div className="relative"><KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="new-password" type="password" autoComplete="new-password" minLength="8" required value={passwordForm.password} onChange={event => setPasswordForm({ ...passwordForm, password: event.target.value })} className="h-11 w-full pl-10 pr-3" /></div></div>
            <div><label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium">Confirm new password</label><div className="relative"><KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="confirm-new-password" type="password" autoComplete="new-password" minLength="8" required value={passwordForm.password_confirmation} onChange={event => setPasswordForm({ ...passwordForm, password_confirmation: event.target.value })} className="h-11 w-full pl-10 pr-3" /></div></div>
          </div>
          <div className="mt-8 flex justify-end border-t border-purple-100 pt-6"><button disabled={passwordSaving} className="btn-primary min-w-40">{passwordSaving ? 'Updating…' : 'Update password'}</button></div>
          </form> : emailStep === 'request' ? <div className="rounded-xl border border-purple-100 bg-lavender/35 p-5"><div className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-primary-deep shadow-sm"><Mail className="h-5 w-5" /></span><div><h3 className="font-semibold">Send a six-digit security code</h3><p className="mt-1 break-all text-sm leading-6 text-text-muted">The code will be sent to {user?.email} and expires shortly.</p></div></div><button type="button" onClick={sendEmailCode} disabled={emailBusy} className="btn-primary mt-5 w-full"><Send className="h-4 w-4" />{emailBusy ? 'Sending…' : 'Send email code'}</button></div> : emailStep === 'code' ? <form onSubmit={verifyEmailCode}><label htmlFor="profile-email-code" className="block text-sm font-medium">Six-digit security code</label><div className="relative mt-2"><KeyRound className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" /><input id="profile-email-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required value={emailCode} onChange={event => setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-11 w-full pl-10 pr-3 tracking-[.25em]" placeholder="000000" /></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button type="button" onClick={sendEmailCode} disabled={emailBusy} className="btn-ghost">Resend code</button><button disabled={emailBusy || emailCode.length !== 6} className="btn-primary">{emailBusy ? 'Checking…' : 'Verify code'}</button></div></form> : <form onSubmit={changePasswordWithCode}><div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="code-new-password" className="mb-1 block text-sm font-medium">New password</label><input id="code-new-password" type="password" autoComplete="new-password" minLength="8" required value={emailPassword.password} onChange={event => setEmailPassword({ ...emailPassword, password: event.target.value })} className="h-11 w-full px-3" /></div><div><label htmlFor="code-confirm-password" className="mb-1 block text-sm font-medium">Confirm new password</label><input id="code-confirm-password" type="password" autoComplete="new-password" minLength="8" required value={emailPassword.password_confirmation} onChange={event => setEmailPassword({ ...emailPassword, password_confirmation: event.target.value })} className="h-11 w-full px-3" /></div></div><p className="mt-4 text-xs leading-5 text-text-muted">For security, you will be signed out after the password changes.</p><div className="mt-6 flex justify-end"><button disabled={emailBusy} className="btn-primary">{emailBusy ? 'Updating…' : 'Change password'}</button></div></form>}
        </div>
      </div>
    </div>
  </DashboardLayout>;
};

export default AccountProfile;
