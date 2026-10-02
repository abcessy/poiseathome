import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../../layouts/DashboardLayout';
import { fetchApi, mediaUrl } from '../../../services/api';
import { formatMoney, formatDuration } from '../../../utils/formatters';
import { ImageIcon } from 'lucide-react';

const StaffServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await fetchApi('/staff/services');
        if (res.ok) setServices((await res.json()).data);
      } catch(e) {} finally { setLoading(false); }
    };
    loadServices();
  }, []);

  return (
    <DashboardLayout role="staff">
      <h1 className="text-3xl font-bold text-text-primary mb-2">My Services</h1>
      <p className="text-text-muted mb-8">Services you are qualified to perform. Contact an admin if this list is incomplete.</p>

      {loading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <p className="text-text-muted">No services have been assigned to your profile yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(svc => (
            <div key={svc.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="h-40 bg-lavender/30 relative">
                {svc.image_path ? (
                  <img src={mediaUrl(svc.image_path)} className="w-full h-full object-cover" alt={svc.name} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-primary-purple/40">
                    <ImageIcon className="w-12 h-12" />
                  </div>
                )}
                {svc.is_home_service && (
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur text-primary-deep text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                    Home Service
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-xs font-semibold text-primary-purple uppercase tracking-wider mb-1">{svc.category?.name}</span>
                <h3 className="font-bold text-lg text-text-primary mb-2">{svc.name}</h3>
                
                <div className="mt-auto pt-4 flex justify-between items-center text-sm font-medium text-text-muted border-t border-gray-50">
                  <span>{formatDuration(svc.duration_minutes)}</span>
                  <span className="text-text-primary">{formatMoney(svc.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default StaffServices;
