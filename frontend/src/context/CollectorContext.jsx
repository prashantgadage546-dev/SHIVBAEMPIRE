// =============================================================
// SHIVBAEMPIRE — Collector Context (Active Collector Switcher)
// Access restricted to default collectors: Prashant Gadage & Swapnil Gadage
// =============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const CollectorContext = createContext(null);

export const DEFAULT_COLLECTORS = [
  { id: 1, full_name: 'Prashant Gadage', username: 'prashant.gadage', mobile: '9309971590', role: 'COLLECTOR' },
  { id: 2, full_name: 'Swapnil Gadage', username: 'swapnil.gadage', mobile: '9112816997', role: 'COLLECTOR' },
];

export const CollectorProvider = ({ children }) => {
  const [collectors, setCollectors] = useState(DEFAULT_COLLECTORS);
  const [activeCollector, setActiveCollectorState] = useState(() => {
    const savedId = localStorage.getItem('shivba_active_collector');
    const found = DEFAULT_COLLECTORS.find(c => String(c.id) === String(savedId));
    return found || DEFAULT_COLLECTORS[0]; // Default to Prashant Gadage
  });

  useEffect(() => {
    api.get('/collectors')
      .then(res => {
        if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
          setCollectors(res.data.data);
          const savedId = localStorage.getItem('shivba_active_collector');
          const current = res.data.data.find(c => String(c.id) === String(savedId)) || res.data.data[0];
          if (current) setActiveCollectorState(current);
        }
      })
      .catch(() => {});
  }, []);

  const setActiveCollector = (collectorId) => {
    const found = collectors.find(c => String(c.id) === String(collectorId));
    if (found) {
      setActiveCollectorState(found);
      localStorage.setItem('shivba_active_collector', String(found.id));
    }
  };

  return (
    <CollectorContext.Provider value={{ activeCollector, collectors, setActiveCollector }}>
      {children}
    </CollectorContext.Provider>
  );
};

export const useCollector = () => {
  const ctx = useContext(CollectorContext);
  if (!ctx) throw new Error('useCollector must be used within CollectorProvider');
  return ctx;
};
