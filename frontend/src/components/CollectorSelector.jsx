// =============================================================
// SHIVBAEMPIRE — Collector Switcher Header Component
// Switch active collector (Prashant Gadage / Swapnil Gadage)
// =============================================================
import { useCollector } from '../context/CollectorContext';
import { UserCheck } from 'lucide-react';

export default function CollectorSelector() {
  const { activeCollector, collectors, setActiveCollector } = useCollector();

  return (
    <div className="flex items-center gap-1 sm:gap-2 bg-slate-900 text-white px-2.5 sm:px-3 py-1.5 rounded-full border border-slate-700 text-xs shadow-sm transition-all hover:bg-slate-800 max-w-[130px] sm:max-w-none">
      <UserCheck size={14} className="text-amber-400 flex-shrink-0" />
      <select
        value={activeCollector.id}
        onChange={e => setActiveCollector(e.target.value)}
        className="bg-transparent font-semibold text-white outline-none cursor-pointer pr-1 w-full truncate text-[11px] sm:text-xs"
      >
        {collectors.map(c => (
          <option key={c.id} value={c.id} className="bg-gray-900 text-white">
            {c.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
