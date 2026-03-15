'use client';
import { createContext, useContext, useState, useCallback } from 'react';

export type Lang = 'ko' | 'en';

type LanguageContextType = {
  lang: Lang;
  toggleLang: () => void;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ko',
  toggleLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko');

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ko' ? 'en' : 'ko'));
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
