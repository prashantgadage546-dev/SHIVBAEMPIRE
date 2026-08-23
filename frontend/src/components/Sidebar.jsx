// =============================================================
// SHIVBAEMPIRE — Sidebar Component (Bilingual English / Marathi)
// Displays active selected collector (Prashant Gadage / Swapnil Gadage)
// =============================================================
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, Receipt, TrendingDown,
  UserCheck, FileBarChart, Calendar, Activity, Settings, X
} from 'lucide-react';
import { useCollector } from '../context/CollectorContext';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ mobile = false, onClose }) {
  const { activeCollector } = useCollector();
  const { t } = useLanguage();

  const links = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('navDashboard') },
    { path: '/donors', icon: Users, label: t('navDonors') },
    { path: '/collections', icon: CreditCard, label: t('navCollections') },
    { path: '/receipts', icon: Receipt, label: t('navReceipts') },
    { path: '/expenses', icon: TrendingDown, label: t('navExpenses') },
    { path: '/collectors', icon: UserCheck, label: t('navCollectors') },
    { path: '/events', icon: Calendar, label: t('navEvents') },
    { path: '/reports', icon: FileBarChart, label: t('navReports') },
    { path: '/activity-logs', icon: Activity, label: t('navAuditLogs') },
    { path: '/settings', icon: Settings, label: t('navSettings') },
  ];

  return (
    <aside className={`sidebar h-full flex flex-col ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-xl tracking-tight">{t('brandName')}</div>
          <div className="text-gray-400 text-xs mt-0.5 leading-tight">{t('orgSubtitle')}</div>
        </div>
        {mobile && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {links.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Active Collector Info */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="px-3 py-2 bg-white/5 rounded-lg">
          <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-0.5">Active Collector</div>
          <div className="text-white text-sm font-bold truncate">{activeCollector?.full_name || 'Prashant Gadage'}</div>
          <div className="text-gray-400 text-xs truncate">📞 {activeCollector?.mobile || '9876543210'}</div>
        </div>
      </div>
    </aside>
  );
}
