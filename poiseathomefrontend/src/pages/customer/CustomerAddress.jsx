import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, MapPin, Navigation, Pencil, Save, ShieldCheck, Trash2 } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchApi } from '../../services/api';
import { useAppDialog } from '../../context/AppDialogContext';

const CustomerAddress = () => {
  const { checkUser } = useAuth();
  const [address, setAddress] = useState('');
  const [savedAddress, setSavedAddress] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { confirmDialog } = useAppDialog();

  useEffect(() => {
    fetchApi('/customer/address')
      .then(async response => {
        if (!response.ok) throw new Error();
        const value = (await response.json()).data?.address || '';
        setAddress(value); setSavedAddress(value); setEditing(!value);
      })
      .catch(() => setError('Your saved address could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  const saveAddress = async event => {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try {
      const response = await fetchApi('/customer/address', { method: 'PUT', body: JSON.stringify({ address: address.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Address could not be saved.');
      setSavedAddress(data.data.address); setAddress(data.data.address); setEditing(false); setMessage('Address saved successfully.'); await checkUser();
    } catch (exception) { setError(exception.message); }
    finally { setSaving(false); }
  };

  const removeAddress = async () => {
    if (!await confirmDialog('Remove your saved home-service address?', { title: 'Remove address', confirmLabel: 'Remove address', tone: 'danger' })) return;
    setError(''); setMessage('');
    const response = await fetchApi('/customer/address', { method: 'DELETE' });
    if (response.ok) { setAddress(''); setSavedAddress(''); setEditing(true); setMessage('Address removed.'); await checkUser(); }
    else setError('Address could not be removed.');
  };

  return (
    <DashboardLayout role="customer">
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-3xl border border-purple-100 bg-gradient-to-r from-lavender to-fuchsia-50 px-6 py-7 sm:px-8"><div className="absolute right-8 top-1/2 hidden -translate-y-1/2 sm:block"><Navigation className="h-24 w-24 rotate-12 text-purple-200/60" /></div><div className="relative flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-purple text-white shadow-lg shadow-purple-200"><MapPin className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-primary-purple">Booking location</p><h1 className="page-title mt-1">Home-service address</h1><p className="mt-2 max-w-xl text-text-muted">Save the exact location your stylist should visit. You can still adjust it during booking.</p></div></div></section>
        {message && <div className="mt-6 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"><CheckCircle className="h-4 w-4" />{message}</div>}
        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_18rem]"><section className={`rounded-2xl p-6 sm:p-8 ${editing ? 'form-surface' : 'border border-gray-200 bg-white shadow-sm'}`}>
          {loading ? <p className="text-sm text-text-muted">Loading address…</p> : editing ? (
            <form onSubmit={saveAddress}><label htmlFor="customer-address" className="block text-sm font-semibold">Complete home address</label><p className="mt-1 text-sm text-text-muted">Include the house or unit, street, barangay, city or municipality, and province.</p><textarea id="customer-address" value={address} onChange={event => setAddress(event.target.value)} required maxLength={500} rows={5} className="mt-4 w-full px-4 py-3" placeholder="House/unit, street, barangay, city or municipality, province" /><div className="mt-5 flex justify-end gap-3">{savedAddress && <button type="button" onClick={() => { setAddress(savedAddress); setEditing(false); setError(''); }} className="btn-outline">Cancel</button>}<button type="submit" disabled={saving || !address.trim()} className="btn-primary"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save address'}</button></div></form>
          ) : (
            <div><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary-purple">Saved address</p><h2 className="mt-1 section-title">Default booking location</h2></div><span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">Active</span></div><p className="mt-5 whitespace-pre-line rounded-lg bg-background p-4 leading-7 text-text-primary">{savedAddress}</p><div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={removeAddress} className="btn-outline text-red-700"><Trash2 className="h-4 w-4" />Remove</button><button type="button" onClick={() => setEditing(true)} className="btn-primary"><Pencil className="h-4 w-4" />Edit address</button></div></div>
          )}
        </section><aside className="space-y-4"><div className="rounded-2xl bg-[#301837] p-5 text-white"><Home className="h-6 w-6 text-fuchsia-300" /><h2 className="mt-4 font-bold">Help your stylist arrive smoothly</h2><p className="mt-2 text-sm leading-6 text-white/70">Include your unit or house number, street, barangay, city, and a recognizable landmark.</p></div><div className="rounded-2xl border border-purple-100 bg-white p-5"><ShieldCheck className="h-5 w-5 text-primary-purple" /><p className="mt-3 text-sm leading-6 text-text-muted">Your saved address is shown only where needed to coordinate your home service.</p></div></aside></div>
      </div>
    </DashboardLayout>
  );
};

export default CustomerAddress;
