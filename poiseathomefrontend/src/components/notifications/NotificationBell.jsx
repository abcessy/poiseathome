import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchApi } from '../../services/api';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime } from '../../utils/formatters';

const NotificationBell = () => {
  const { unreadCount, decrementUnread } = useNotifications();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = async () => {
    setOpen(!open);
    if (!open) {
      setLoading(true);
      try {
        const res = await fetchApi('/notifications?page=1');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data.slice(0, 5));
        }
      } catch(e) {} finally { setLoading(false); }
    }
  };

  const markRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        decrementUnread();
      }
    } catch(e) {}
  };

  const getDestinationUrl = (notif) => {
    const { reference_type, reference_id, reference_code } = notif;
    if (!reference_type) return null;
    
    if (user.role === 'customer') {
      if (reference_type === 'appointment') return `/account/appointments/${reference_code}`;
      if (reference_type === 'payment') return `/account/appointments`; // rough mapping
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
    if (!notif.is_read) {
      await markRead(notif.id);
    }
    setOpen(false);
    const dest = getDestinationUrl(notif);
    if (dest) navigate(dest);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={toggleDropdown}
        className="relative p-2 text-text-muted hover:text-primary-purple hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-red-500 rounded-full border-2 border-white transform translate-x-1/4 -translate-y-1/4">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-text-primary">Notifications</h3>
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-text-muted">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-muted">No notifications found.</div>
            ) : (
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
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-lavender/10' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-sm font-semibold ${!n.is_read ? 'text-primary-deep' : 'text-text-primary'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        {!n.is_read && (
                          <button 
                            onClick={(e) => markRead(n.id, e)}
                            aria-label={`Mark ${n.title} as read`}
                            className="text-[10px] text-primary-purple hover:underline"
                          >
                            Mark Read
                          </button>
                        )}
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary-purple block"></span>}
                      </div>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 mb-2">{n.message}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
            <Link 
              to="/notifications" 
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-primary-purple hover:text-primary-deep"
            >
              View All Notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
