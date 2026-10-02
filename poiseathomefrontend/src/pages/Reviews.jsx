import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, MessageCircleHeart, Scissors, Star } from 'lucide-react';
import PublicFooter from '../components/PublicFooter';
import PublicHeader from '../components/PublicHeader';
import { useAuth } from '../context/AuthContext';
import { fetchApi, mediaUrl } from '../services/api';

const Stars = ({ value, interactive = false, onChange }) => <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map(star => interactive ? <button key={star} type="button" onClick={() => onChange(star)} className="rounded-md p-1 text-amber-400 transition hover:scale-110" aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}><Star className={`h-7 w-7 ${star <= value ? 'fill-current' : 'text-gray-300'}`} /></button> : <Star key={star} className={`h-4 w-4 ${star <= value ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`} />)}</div>;

const Reviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: 0, count: 0, average_stylist: 0, average_shop: 0 });
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ 
    rating: 5, 
    stylist_rating: 5, 
    shop_rating: 5, 
    comment: '', 
    staff_user_id: '' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadReviews = async () => {
    const response = await fetchApi('/reviews');
    if (!response.ok) throw new Error('Reviews could not be loaded.');
    const data = (await response.json()).data;
    setReviews(data.reviews || []); 
    setSummary(data.summary || { average: 0, count: 0, average_stylist: 0, average_shop: 0 });
  };

  useEffect(() => {
    Promise.all([
      loadReviews(), 
      user?.role === 'customer' ? fetchApi('/customer/review').then(async response => {
        if (!response.ok) throw new Error('Your rating details could not be loaded.');
        const data = (await response.json()).data;
        setStaff(data.staff || []);
        if (data.review) {
          setForm({ 
            rating: data.review.rating, 
            stylist_rating: data.review.stylist_rating || data.review.rating || 5,
            shop_rating: data.review.shop_rating || data.review.rating || 5,
            comment: data.review.comment || '', 
            staff_user_id: data.review.staff_user_id || '' 
          });
        }
      }) : Promise.resolve()
    ]).catch(exception => setError(exception.message)).finally(() => setLoading(false));
  }, [user?.role]);

  const handleCategoryRating = (field, val) => {
    const updated = { ...form, [field]: val };
    // Composite average rating rounded to 1 decimal
    updated.rating = Math.round(((updated.stylist_rating + updated.shop_rating) / 2));
    setForm(updated);
  };

  const submit = async event => {
    event.preventDefault(); 
    setSaving(true); 
    setError(''); 
    setMessage('');
    try {
      const response = await fetchApi('/customer/review', { 
        method: 'PUT', 
        body: JSON.stringify({ 
          ...form, 
          staff_user_id: form.staff_user_id || null 
        }) 
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(Object.values(payload.errors || {})[0]?.[0] || payload.message || 'Your rating could not be saved.');
      setMessage(payload.message); 
      await loadReviews();
    } catch (exception) { 
      setError(exception.message); 
    } finally { 
      setSaving(false); 
    }
  };

  return <div className="min-h-screen bg-background"><PublicHeader /><main>
    <section className="relative overflow-hidden bg-[#301837] px-4 py-16 text-white sm:px-6 lg:py-20">
      <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-fuchsia-500/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_24rem] lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-fuchsia-200"><Scissors className="h-4 w-4" /> Customer experiences</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">Real care, shared by our customers.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/70">Read verified reviews from PoiseAtHome clients and see how our stylists and salon service are rated.</p>
        </div>
        
        <div className="rounded-2xl bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur">
          <p className="text-sm text-white/60">Overall customer rating</p>
          <div className="mt-2 flex items-end gap-3">
            <span className="text-5xl font-bold">{summary.count ? summary.average : '—'}</span>
            <span className="pb-1 text-white/60">out of 5</span>
          </div>
          <div className="mt-3"><Stars value={Math.round(summary.average)} /></div>
          
          {summary.count > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3 text-xs">
              <div>
                <span className="text-white/60 block">Stylist Service:</span>
                <span className="font-bold text-fuchsia-200">{summary.stylist_average || summary.average_stylist || summary.average} / 5</span>
              </div>
              <div>
                <span className="text-white/60 block">Shop & Salon:</span>
                <span className="font-bold text-fuchsia-200">{summary.shop_average || summary.average_shop || summary.average} / 5</span>
              </div>
            </div>
          )}

          <p className="mt-3 text-xs text-white/55">Based on {summary.count} {summary.count === 1 ? 'review' : 'reviews'}</p>
        </div>
      </div>
    </section>

    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[22rem_1fr] lg:px-8 lg:py-16">
      <aside>
        <div className="sticky top-24 rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-purple text-white">
            <MessageCircleHeart className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-bold">Rate your experience</h2>
          
          {user?.role === 'customer' ? (
            <form onSubmit={submit} className="mt-5 space-y-4">
              {/* Category 1: Stylist Rating */}
              <div>
                <label className="text-xs font-bold uppercase text-text-primary block mb-1">
                  1. Stylist's Service *
                </label>
                <p className="text-[11px] text-text-muted mb-1.5">Rate the hairstylist's technique, haircut, and attention</p>
                <Stars value={form.stylist_rating} interactive onChange={val => handleCategoryRating('stylist_rating', val)} />
              </div>

              {/* Category 2: Shop Rating */}
              <div>
                <label className="text-xs font-bold uppercase text-text-primary block mb-1">
                  2. Salon / Poise Experience *
                </label>
                <p className="text-[11px] text-text-muted mb-1.5">Rate the salon communication, booking, and punctuality</p>
                <Stars value={form.shop_rating} interactive onChange={val => handleCategoryRating('shop_rating', val)} />
              </div>

              <div>
                <label htmlFor="review-staff" className="block text-xs font-bold uppercase text-text-primary mb-1">
                  Specific Stylist <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <select 
                  id="review-staff" 
                  value={form.staff_user_id} 
                  onChange={event => setForm({ ...form, staff_user_id: event.target.value })} 
                  className="h-10 w-full px-3 text-xs border rounded-lg"
                >
                  <option value="">General PoiseAtHome review</option>
                  {staff.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name}{person.specialization ? ` — ${person.specialization}` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-text-muted">Only hairstylists from your completed appointments appear here.</p>
              </div>

              <div>
                <label htmlFor="review-comment" className="block text-xs font-bold uppercase text-text-primary mb-1">
                  Your feedback <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <textarea 
                  id="review-comment" 
                  rows={4} 
                  maxLength={1500} 
                  value={form.comment} 
                  onChange={event => setForm({ ...form, comment: event.target.value })} 
                  className="w-full px-3 py-2 text-xs border rounded-lg" 
                  placeholder="Tell us what made your experience memorable." 
                />
              </div>

              {message && <div className="flex gap-2 rounded-lg bg-green-50 p-3 text-xs text-green-700"><CheckCircle className="h-4 w-4 shrink-0" />{message}</div>}
              {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</div>}
              
              <button disabled={saving} className="btn-primary w-full text-sm">
                {saving ? 'Saving…' : 'Share my rating'}
              </button>
            </form>
          ) : (
            <div className="mt-4">
              <p className="text-sm leading-6 text-text-muted">Sign in with a customer account to share your experience.</p>
              <Link to="/login" className="btn-primary mt-5 w-full">Sign in to rate us</Link>
            </div>
          )}
        </div>
      </aside>

      <section>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-primary-purple">From the community</p>
          <h2 className="mt-2 text-2xl font-bold">What customers are saying</h2>
        </div>
        
        {loading ? (
          <p className="py-12 text-center text-sm text-text-muted">Loading customer reviews…</p>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white p-12 text-center">
            <Star className="mx-auto h-8 w-8 text-purple-300" />
            <h3 className="mt-4 font-bold">Be the first to rate PoiseAtHome</h3>
            <p className="mt-2 text-sm text-text-muted">Customer reviews will appear here once submitted.</p>
          </div>
        ) : (
          <div className="columns-1 gap-5 md:columns-2">
            {reviews.map(review => (
              <article key={review.id} className="mb-5 break-inside-avoid rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {review.customer_avatar_path ? (
                      <img src={mediaUrl(review.customer_avatar_path)} alt="" className="h-11 w-11 rounded-xl object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-lavender font-bold text-primary-deep">
                        {review.customer_name?.charAt(0)}
                      </span>
                    )}
                    <div>
                      <h3 className="font-bold text-sm">{review.customer_name}</h3>
                      <p className="text-xs text-text-muted">{new Date(review.created_at).toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <Stars value={review.rating} />
                </div>

                {/* Rating categories breakdown badge if available */}
                {(review.stylist_rating || review.shop_rating) && (
                  <div className="mt-3 flex gap-3 text-[11px] font-semibold text-text-muted bg-purple-50/50 p-2 rounded-lg">
                    {review.stylist_rating && <span>Stylist: <strong className="text-primary-deep">{review.stylist_rating}/5</strong></span>}
                    {review.stylist_rating && review.shop_rating && <span>•</span>}
                    {review.shop_rating && <span>Salon: <strong className="text-primary-deep">{review.shop_rating}/5</strong></span>}
                  </div>
                )}

                {review.comment && <p className="mt-3 text-sm leading-6 text-text-muted">“{review.comment}”</p>}
                
                {review.staff_name && (
                  <div className="mt-4 flex items-center gap-2 border-t border-purple-50 pt-3 text-xs font-semibold text-primary-deep">
                    <Scissors className="h-4 w-4" /> Service by {review.staff_name}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  </main><PublicFooter /></div>;
};

export default Reviews;
