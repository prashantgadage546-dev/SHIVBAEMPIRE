// =============================================================
// SHIVBAEMPIRE — Global Event Context (Event Selector & Accounts)
// =============================================================
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const EventContext = createContext(null);

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventIdState] = useState(() => {
    return localStorage.getItem('shivba_selected_event') || '';
  });

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/events');
      const list = data.data || [];
      setEvents(list);
      
      // Default to active event if no selection saved
      const saved = localStorage.getItem('shivba_selected_event');
      if (!saved && list.length > 0) {
        const active = list.find(e => e.is_active);
        const defaultId = active ? String(active.id) : String(list[0].id);
        setSelectedEventIdState(defaultId);
        localStorage.setItem('shivba_selected_event', defaultId);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setSelectedEventId = (id) => {
    const val = String(id);
    setSelectedEventIdState(val);
    localStorage.setItem('shivba_selected_event', val);
  };

  return (
    <EventContext.Provider value={{ events, selectedEventId, setSelectedEventId, fetchEvents }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used within EventProvider');
  return ctx;
};
