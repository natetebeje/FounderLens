/**
 * Theme initialization utility
 * This script should run as early as possible to prevent theme flashing
 */

export const initializeTheme = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') return;

  const storageKey = 'founder-lens-theme';
  const root = document.documentElement;

  // Get stored theme preference
  const storedTheme = localStorage.getItem(storageKey);
  
  // Determine the theme to apply
  let themeToApply: 'light' | 'dark' = 'dark'; // Default to dark theme
  
  if (storedTheme === 'dark') {
    themeToApply = 'dark';
  } else if (storedTheme === 'light') {
    themeToApply = 'light';
  } else if (storedTheme === 'system') {
    // Use system preference when explicitly set to system
    themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else if (!storedTheme) {
    // No stored preference - use dark as default
    themeToApply = 'dark';
  }

  // Apply theme immediately
  root.classList.remove('light', 'dark');
  root.classList.add(themeToApply);

  // Set dark as default theme in localStorage if not set
  if (!storedTheme) {
    localStorage.setItem(storageKey, 'dark');
  }
};

// Inline script content for HTML head injection
export const getThemeInitScript = () => `
(function() {
  try {
    const storageKey = 'founder-lens-theme';
    const root = document.documentElement;
    const storedTheme = localStorage.getItem(storageKey);
    
    let themeToApply = 'dark'; // Default to dark theme
    
    if (storedTheme === 'dark') {
      themeToApply = 'dark';
    } else if (storedTheme === 'light') {
      themeToApply = 'light';
    } else if (storedTheme === 'system') {
      // Properly detect system preference when "system" is selected
      themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else if (!storedTheme) {
      // No stored preference - use dark as default
      themeToApply = 'dark';
    }
    
    root.classList.remove('light', 'dark');
    root.classList.add(themeToApply);
    
    // Set dark as default if no preference is stored
    if (!storedTheme) {
      localStorage.setItem(storageKey, 'dark');
    }
  } catch (e) {
    // Fallback to dark theme if anything fails
    document.documentElement.classList.add('dark');
  }
})();
`;
