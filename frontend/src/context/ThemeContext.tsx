import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '../components/ui';

export type Theme = {
  id: string;
  name: string;
  primary: string;
  accent: string;
  bg: string;
  category: 'Classique' | 'Nature' | 'Vibrant' | 'Sombre' | 'Élégant' | 'Technique';
};

export const THEMES: Theme[] = [
  { id: 'van-btp-default', name: 'VAN BTP (Défaut)', primary: '#1a365d', accent: '#e11d48', bg: '#f8fafc', category: 'Classique' },
  { id: 'ocean', name: 'Océan', primary: '#0369a1', accent: '#0ea5e9', bg: '#f0f9ff', category: 'Nature' },
  { id: 'sunset', name: 'Coucher de soleil', primary: '#c2410c', accent: '#f97316', bg: '#fff7ed', category: 'Vibrant' },
  { id: 'royal', name: 'Royal', primary: '#6d28d9', accent: '#8b5cf6', bg: '#f5f3ff', category: 'Élégant' },
  { id: 'blue-print', name: 'Plan Bleu', primary: '#2563eb', accent: '#60a5fa', bg: '#f0f9ff', category: 'Technique' },
];

export type DisplayMode = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact' | 'large';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (id: string) => void;
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  density: Density;
  setDensity: (density: Density) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('light');
  const [density, setDensity] = useState<Density>('comfortable');

  useEffect(() => {
    const savedTheme = localStorage.getItem('van-btp-theme');
    if (savedTheme) {
      const theme = THEMES.find(t => t.id === savedTheme);
      if (theme) setCurrentTheme(theme);
    }

    const savedMode = localStorage.getItem('van-btp-display-mode') as DisplayMode;
    if (savedMode) setDisplayMode(savedMode);

    const savedDensity = localStorage.getItem('van-btp-density') as Density;
    if (savedDensity) setDensity(savedDensity);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (displayMode === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(displayMode);
    }
    localStorage.setItem('van-btp-display-mode', displayMode);
  }, [displayMode]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('density-comfortable', 'density-compact', 'density-large');
    root.classList.add(`density-${density}`);
    localStorage.setItem('van-btp-density', density);
  }, [density]);

  const setTheme = (id: string) => {
    const theme = THEMES.find(t => t.id === id);
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem('van-btp-theme', id);
      
      document.documentElement.style.setProperty('--color-primary', theme.primary);
      document.documentElement.style.setProperty('--color-accent', theme.accent);
      document.documentElement.style.setProperty('--color-bg', theme.bg);
    }
  };

  return (
    <ThemeContext.Provider value={{ 
      currentTheme, 
      setTheme, 
      displayMode, 
      setDisplayMode, 
      density, 
      setDensity 
    }}>
      <div 
        className={cn(displayMode === 'dark' ? 'dark' : '')}
        style={{ 
          '--color-primary': currentTheme.primary, 
          '--color-accent': currentTheme.accent,
          '--color-bg': currentTheme.bg 
        } as any}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

