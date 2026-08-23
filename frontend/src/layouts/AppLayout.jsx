// =============================================================
// SHIVBAEMPIRE — Main App Layout (With Collector & Event Selectors)
// =============================================================
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import EventSelector from '../components/EventSelector';
import CollectorSelector from '../components/CollectorSelector';
import { useCollector } from '../context/CollectorContext';
import { useLanguage } from '../context/LanguageContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { activeCollector } = useCollector();
  const { t } = useLanguage();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            <Sidebar mobile onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between flex-shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 active:scale-95 transition-transform"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            {/* Mobile brand */}
            <div className="md:hidden truncate">
              <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">{t('brandName')}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 overflow-x-auto no-scrollbar py-0.5 justify-end">
            {/* Collector Switcher (Prashant Gadage / Swapnil Gadage) */}
            <CollectorSelector />

            {/* Global Event Selector */}
            <EventSelector />

            {/* Language Switcher Button */}
            <LanguageSwitcher />

            {/* Active User Avatar */}
            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {activeCollector?.full_name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div className="hidden md:block text-right">
                <div className="text-sm font-semibold text-gray-900">{activeCollector?.full_name}</div>
                <div className="text-xs text-gray-500">Collector / कार्यकर्ता</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
