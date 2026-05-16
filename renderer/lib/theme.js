import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lumen_theme');
    if (stored === 'dark') {
      setDark(true);
      document.documentElement.classList.add('dark');
    } else if (stored === 'light') {
      setDark(false);
      document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lumen_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lumen_theme', 'light');
    }
  };

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);