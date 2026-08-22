import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../services/api';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { CheckCircle } from 'lucide-react';
import { formatDateTime } from '../utils/formatters';

const Notifications = () => {
  const { user } = useAuth();
  const { loadUnreadCount } = useNotifications();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications(1);
  }, [filter]);

  const loadNotifications = async (p = 1) => {
    setLoading(true);
    try {
      const unreadParam = filter === 'unread' ? '&unread=true' : '';
      const res = await fetchApi(`/notifications?page=${p}${unreadParam}`);
      if (res.ok) {
        const data = await res.json();
        if (p === 1) setNotifications(data.data);
        else setNotifications(prev => [...prev, ...data.data]);
        setMeta(data.meta);
        setPage(p);
      }
    } catch(e) {} finally { setLoading(false); }
  };

  const markRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        loadUnreadCount();
      }
    } catch(e) {}
  };

  const markAllRead = async () => {
    try {
      const res = await fetchApi(`/notifications/read-all`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        loadUnreadCount();
      }
    } catch(e) {}
  };

  const getDestinationUrl = (notif) => {
    const { reference_type, reference_id, reference_code } = notif;
    if (!reference_type) return null;
    if (user.role === 'customer') {
      if (reference_type === 'appointment') return `/account/appointments/${reference_code}`;
      if (reference_type === 'payment') return `/account/appointments`; 
    } else if (user.role === 'admin') {
      if (reference_type === 'appointment') return `/admin/appointments/${reference_id}`;
      if (reference_type === 'payment') return `/admin/payments/${reference_id}`;
      if (reference_type === 'product') return `/admin/inventory/${reference_id}`;
    } else if (user.role === 'staff') {
      if (reference_type === 'appointment') return `/staff/appointments/${reference_id}`;
    }
    return null;
  };

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) await markRead(notif.id);
    const dest = getDestinationUrl(notif);
    if (dest) navigate(dest);
  };

  return (
    <DashboardLayout role={user?.role}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="page-title">Notifications</h1>
        <button onClick={markAllRead} className="px-4 py-2 bg-white text-primary-purple border border-primary-purple/20 font-bold rounded-lg hover:bg-lavender transition-colors flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" /> Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex p-4 border-b border-gray-100 gap-2 bg-gray-50/50">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === 'all' ? 'bg-primary-purple text-white' : 'bg-white text-text-muted border hover:bg-gray-50'}`}>All</button>
          <button onClick={() => setFilter('unread')} className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${filter === 'unread' ? 'bg-primary-purple text-white' : 'bg-white text-text-muted border hover:bg-gray-50'}`}>Unread</button>
        </div>

        <div className="divide-y divide-gray-50">
          {notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => handleNotifClick(n)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleNotifClick(n);
                }
              }}
              role="button"
              tabIndex={0}
              className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col md:flex-row justify-between md:items-center ${!n.is_read ? 'bg-lavender/5' : ''}`}
            >
              <div>
                <div className="flex items-center mb-1">
                  {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary-purple block mr-3"></span>}
                  <p className={`text-base font-bold ${!n.is_read ? 'text-primary-deep' : 'text-text-primary'}`}>
                    {n.title}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${!n.is_read ? 'ml-5' : ''} text-text-muted`}>{n.message}</p>
                <p className={`text-xs mt-2 ${!n.is_read ? 'ml-5' : ''} text-gray-400 font-mono`}>
                  {formatDateTime(n.created_at)}
                </p>
              </div>
              
              {!n.is_read && (
                <button 
                  onClick={(e) => markRead(n.id, e)}
                  aria-label={`Mark ${n.title} as read`}
                  className="mt-4 md:mt-0 px-4 py-2 text-sm font-medium text-primary-purple bg-white border border-primary-purple/20 rounded-lg hover:bg-lavender transition-colors self-start md:self-auto"
                >
                  Mark as read
                </button>
              )}
            </div>
          ))}

          {notifications.length === 0 && !loading && (
            <div className="p-12 text-center text-text-muted">
              No notifications found.
            </div>
          )}
        </div>

        {meta && meta.current_page < meta.last_page && (
          <div className="p-4 border-t border-gray-100 text-center bg-gray-50/50">
            <button 
              onClick={() => loadNotifications(page + 1)}
              disabled={loading}
              className="px-6 py-2 bg-white text-primary-purple font-bold rounded-lg border hover:bg-lavender transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
