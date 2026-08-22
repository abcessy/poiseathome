import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, ImageIcon, Search } from 'lucide-react';
import { fetchApi, mediaUrl } from '../../services/api';
import { formatDuration, formatMoney } from '../../utils/formatters';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';

const ServiceCatalog = () => {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const category = searchParams.get('category') || '';

  const loadServices = async (query = searchQuery) => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (query.trim()) params.set('search', query.trim());
      const response = await fetchApi(`/services${params.toString() ? `?${params}` : ''}`);
      if (!response.ok) throw new Error();
      setServices((await response.json()).data || []);
    } catch { setError('Services could not be loaded. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchApi('/service-categories').then(r => r.ok ? r.json() : Promise.reject()).then(data => setCategories(data.data || [])).catch(() => {});
  }, []);
  useEffect(() => { loadServices(''); }, [category]);

  return (
    <div className="min-h-screen bg-background"><PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-2xl"><h1 className="page-title">Salon services at home</h1><p className="mt-3 text-text-muted">Browse the current Poise Hair Center Salon catalog. Prices and durations shown here are used when you book.</p></div>
        <div className="mt-8 grid gap-4 border-y border-gray-200 py-5 md:grid-cols-[1fr_18rem] md:items-center">
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Service categories">
            <button onClick={() => setSearchParams({})} className={!category ? 'btn-primary shrink-0' : 'btn-outline shrink-0'}>All services</button>
            {categories.map(item => <button key={item.id} onClick={() => setSearchParams({ category: item.slug })} className={category === item.slug ? 'btn-primary shrink-0' : 'btn-outline shrink-0'}>{item.name}</button>)}
          </div>
          <form onSubmit={event => { event.preventDefault(); loadServices(); }}>
            <label htmlFor="service-search" className="sr-only">Search services</label>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-gray-400" /><input id="service-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-11 w-full pl-10 pr-3" placeholder="Search by service name" /></div>
          </form>
        </div>

        {loading ? <p className="py-14 text-center text-sm text-text-muted">Loading services…</p> : error ? <div className="my-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : services.length === 0 ? (
          <div className="py-16 text-center"><h2 className="section-title">{category || searchQuery ? 'No services found' : 'No services available'}</h2><p className="mt-2 text-sm text-text-muted">{category || searchQuery ? 'Try another category or search term.' : 'Please check again later for the current service catalog.'}</p></div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(service => <Link key={service.id} to={`/services/${service.slug}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white hover:border-primary-purple/50">
              <div className="aspect-[4/3] overflow-hidden bg-lavender/40">
                {service.image_path ? <img src={mediaUrl(service.image_path)} alt={`${service.name} service`} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-9 w-9 text-primary-purple/35" aria-hidden="true" /></div>}
              </div>
              <div className="p-5"><p className="text-sm text-text-muted">{service.category?.name}</p><h2 className="mt-1 text-lg font-semibold group-hover:text-primary-deep">{service.name}</h2><div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><span className="flex items-center gap-2 text-sm text-text-muted"><Clock className="h-4 w-4" />{formatDuration(service.duration_minutes)}</span><span className="font-semibold">{formatMoney(service.price)}</span></div></div>
            </Link>)}
          </div>
        )}
      </main><PublicFooter />
    </div>
  );
};
export default ServiceCatalog;
