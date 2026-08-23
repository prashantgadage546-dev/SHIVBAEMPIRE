// =============================================================
// SHIVBAEMPIRE — Language Switcher Button Component
// Toggle between English and Marathi seamlessly
// =============================================================
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm border flex-shrink-0 ${
        language === 'mr'
          ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-600'
          : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
      }`}
      title={language === 'mr' ? 'Switch to English' : 'मराठी भाषा निवडा'}
    >
      <Globe size={14} className="flex-shrink-0" />
      <span className="hidden sm:inline">{language === 'mr' ? 'मराठी ➔ English' : 'English ➔ मराठी'}</span>
      <span className="sm:hidden text-[11px]">{language === 'mr' ? 'मराठी' : 'ENG'}</span>
    </button>
  );
}
