import { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Additional utility functions for theme management
export const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export const applyTheme = (theme: 'light' | 'dark') => {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
};

export const getStoredTheme = (storageKey: string = 'founder-lens-theme'): 'light' | 'dark' | 'system' | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(storageKey);
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored as 'light' | 'dark' | 'system';
  }
  return null;
};

export const storeTheme = (theme: 'light' | 'dark' | 'system', storageKey: string = 'founder-lens-theme') => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey, theme);
};
