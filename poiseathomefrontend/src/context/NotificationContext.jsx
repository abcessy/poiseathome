import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchApi } from '../services/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      intervalRef.current = setInterval(loadUnreadCount, 60000); // 60s polling
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setUnreadCount(0);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const res = await fetchApi('/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.data.count);
      }
    } catch(e) {}
  };

  const decrementUnread = () => setUnreadCount(prev => Math.max(0, prev - 1));
  const clearUnread = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ unreadCount, loadUnreadCount, decrementUnread, clearUnread }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
