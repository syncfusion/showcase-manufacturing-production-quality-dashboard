import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import lightHref from '@syncfusion/ej2-tailwind3-theme/styles/tailwind3.css?url';
import darkHref from '@syncfusion/ej2-tailwind3-dark-theme/styles/tailwind3-dark.css?url';

const THEME_KEY = 'precision-plant.theme';
const LIGHT = lightHref;
const DARK = darkHref;

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  ready: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

function savedTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch { /* storage blocked */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(savedTheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    let cancelled = false;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'syncfusion-theme';
    link.href = theme === 'dark' ? DARK : LIGHT;
    const done = () => { if (!cancelled) setReady(true); };
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    document.head.querySelectorAll('link#syncfusion-theme').forEach(node => node.remove());
    document.head.appendChild(link);
    return () => { cancelled = true; link.remove(); };
  }, [theme]);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch { /* presentation only */ }
    setTheme(next);
    setReady(false);
  };

  return <ThemeContext.Provider value={{ theme, ready, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeState {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme outside ThemeProvider');
  return value;
}
