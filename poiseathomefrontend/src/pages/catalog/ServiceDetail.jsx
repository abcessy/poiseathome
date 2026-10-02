import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { fetchApi, mediaUrl } from '../../services/api';
import { formatMoney, formatDuration } from '../../utils/formatters';
import { ImageIcon, Clock, Home as HomeIcon, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PublicHeader from '../../components/PublicHeader';
import PublicFooter from '../../components/PublicFooter';

const ServiceDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const loadService = async () => {
      try {
        const res = await fetchApi(`/services/${slug}`);
        if (res.ok) {
          setService((await res.json()).data);
        } else {
          navigate('/services', { replace: true });
        }
      } catch (e) {
      } finally { setLoading(false); }
    };
    loadService();
  }, [slug, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!service) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans text-text-primary">
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        
        <Link to="/services" className="inline-flex items-center text-sm font-medium text-text-muted hover:text-primary-purple mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Services
        </Link>

        <div className="mb-12 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white md:flex-row">
          {/* Image */}
          <div className="w-full md:w-1/2 h-64 md:h-auto bg-lavender/30 relative">
            {service.image_path ? (
              <img src={mediaUrl(service.image_path)} className="w-full h-full object-cover" alt={service.name} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-primary-purple/30">
                <ImageIcon className="w-24 h-24" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex w-full flex-col justify-center p-6 md:w-1/2 md:p-10">
            <span className="mb-2 block text-sm font-medium text-text-muted">{service.category?.name}</span>
            <h1 className="page-title mb-4">{service.name}</h1>
            <p className="mb-8 leading-7 text-text-muted">{service.description || 'Service details are available when you book.'}</p>
            
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Duration</span>
                <div className="flex items-center font-medium text-text-primary">
                  <Clock className="w-4 h-4 text-primary-purple mr-2" />
                  {formatDuration(service.duration_minutes)}
                </div>
              </div>
              <div>
                <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Price</span>
                <div className="font-bold text-2xl text-primary-purple">
                  {formatMoney(service.price)}
                </div>
              </div>
            </div>

            {service.is_home_service && (
              <div className="bg-lavender/50 rounded-xl p-4 flex items-start mb-8">
                <HomeIcon className="w-5 h-5 text-primary-deep mt-0.5 mr-3 shrink-0" />
                <p className="text-sm text-primary-deep font-medium leading-snug">This service is available for home booking. A professional hairstylist will travel to your location.</p>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              {user ? (
                user.role === 'customer' ? (
                  <Link to={`/book?service=${service.id}`} className="btn-primary w-full md:w-auto">
                    Book This Service
                  </Link>
                ) : (
                  <p className="text-sm text-text-muted italic">Booking is only available for customer accounts.</p>
                )
              ) : (
                <Link to={`/login?redirect=/book?service=${service.id}`} className="btn-primary w-full md:w-auto">
                  Sign in to Book
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Qualified Staff */}
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Hairstylists offering this service</h2>
          <p className="text-text-muted mb-8">Available hairstylists qualified for this service.</p>
          
          {service.qualified_staff?.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center text-text-muted">
              Currently no hairstylists are listed for this service.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {service.qualified_staff.map(staff => (
                <div key={staff.id} className="flex items-center rounded-xl border border-gray-200 bg-white p-5">
                  <div className="w-16 h-16 rounded-full bg-lavender overflow-hidden flex items-center justify-center shrink-0 border border-gray-100 mr-4">
                    {staff.profile_photo_path ? (
                      <img src={mediaUrl(staff.profile_photo_path)} className="w-full h-full object-cover" alt={staff.name} />
                    ) : (
                      <User className="w-8 h-8 text-primary-purple" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">{staff.name}</h3>
                    <p className="text-sm text-text-muted">{staff.specialization || 'Professional Hairstylist'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main><PublicFooter />
    </div>
  );
};

export default ServiceDetail;
