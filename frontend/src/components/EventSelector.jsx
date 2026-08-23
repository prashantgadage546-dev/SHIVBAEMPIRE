// =============================================================
// SHIVBAEMPIRE — Global Event Selector Dropdown
// Switch active event / festival across the application
// =============================================================
import { useEvent } from '../context/EventContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar } from 'lucide-react';

export default function EventSelector() {
  const { events, selectedEventId, setSelectedEventId } = useEvent();
  const { t } = useLanguage();

  if (events.length === 0) return null;

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 hover:bg-gray-200/80 px-2.5 sm:px-3 py-1.5 rounded-full border border-gray-200 text-xs transition-all max-w-[110px] sm:max-w-none">
      <Calendar size={14} className="text-gray-600 flex-shrink-0" />
      <select
        value={selectedEventId}
        onChange={e => setSelectedEventId(e.target.value)}
        className="bg-transparent font-semibold text-gray-800 outline-none cursor-pointer pr-1 w-full truncate text-[11px] sm:text-xs"
      >
        <option value="">{t('allEvents')}</option>
        {events.map(ev => (
          <option key={ev.id} value={ev.id}>
            {ev.name} {ev.is_active ? '★' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
