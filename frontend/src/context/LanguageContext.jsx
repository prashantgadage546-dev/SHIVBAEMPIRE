// =============================================================
// SHIVBAEMPIRE — Language Context (English / Marathi Switcher)
// =============================================================
import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../translations/dictionary';

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('shivba_lang') || 'mr'; // Default to Marathi ('mr')
  });

  const setLanguage = (lang) => {
    if (lang === 'mr' || lang === 'en') {
      setLanguageState(lang);
      localStorage.setItem('shivba_lang', lang);
    }
  };

  const toggleLanguage = () => {
    const nextLang = language === 'mr' ? 'en' : 'mr';
    setLanguage(nextLang);
  };

  const t = (key) => {
    const currentDict = translations[language] || translations.mr;
    return currentDict[key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
