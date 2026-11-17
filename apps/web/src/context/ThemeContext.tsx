import React, { createContext, useContext, useEffect, useState } from 'react';
import * as echarts from 'echarts';
import { darkTheme, lightTheme } from '../charts/theme.js';

// Register ECharts themes once
echarts.registerTheme('mw-dark',  darkTheme);
echarts.registerTheme('mw-light', lightTheme);

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  echartsTheme: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => undefined,
  echartsTheme: 'mw-dark',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('mw-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    // Default: light (professional hosted appearance)
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mw-theme', theme);
  }, [theme]);

  function toggle() {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, echartsTheme: `mw-${theme}` }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
