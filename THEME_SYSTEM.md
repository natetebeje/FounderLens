# Theme System Documentation

## Overview

The Founder Lens AI Spark application now includes a comprehensive dark/light mode theme system with automatic system detection, manual switching, and persistent storage across sessions.

## Features

### ✅ Automatic System Theme Detection
- Detects user's system preference on first visit
- Automatically applies dark/light mode based on `prefers-color-scheme`
- Updates theme when system preference changes

### ✅ Manual Theme Switching
- Theme toggle button in navigation (always visible)
- Comprehensive theme settings panel in Settings page
- Three options: Light, Dark, System (auto)

### ✅ Persistent Storage
- User preferences saved in `localStorage`
- Persists across browser sessions and page reloads
- Storage key: `founder-lens-theme`

### ✅ Accessibility Compliance
- Proper ARIA labels on theme toggle buttons
- Screen reader support with descriptive text
- Keyboard navigation support
- High contrast maintained in both themes

### ✅ Performance Optimized
- Theme initialization script in HTML head prevents FOUC (Flash of Unstyled Content)
- CSS custom properties for efficient theme switching
- Minimal JavaScript overhead

## Implementation Details

### Core Components

1. **ThemeContext** (`src/contexts/ThemeContext.tsx`)
   - React context for theme state management
   - Handles system theme detection and changes
   - Manages localStorage persistence

2. **ThemeToggle** (`src/components/ui/theme-toggle.tsx`)
   - Dropdown theme selector with Light/Dark/System options
   - Simple toggle button for quick light/dark switching
   - Integrated into navigation bar

3. **ThemeSettings** (`src/components/ui/theme-settings.tsx`)
   - Comprehensive settings panel for theme preferences
   - Visual indicators for current theme
   - Detailed descriptions for each option

4. **Theme Hook** (`src/hooks/useTheme.ts`)
   - Custom hook for accessing theme context
   - Utility functions for theme management

### CSS Architecture

The theme system uses CSS custom properties defined in `src/index.css`:

```css
:root {
  /* Light theme variables */
  --background: 260 40% 98%;
  --foreground: 260 10% 15%;
  /* ... more variables */
}

.dark {
  /* Dark theme variables */
  --background: 260 20% 8%;
  --foreground: 260 15% 95%;
  /* ... more variables */
}
```

### Tailwind Configuration

Tailwind is configured with `darkMode: ["class"]` in `tailwind.config.ts`, enabling class-based dark mode switching.

## Usage

### Basic Theme Toggle

```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle';

function MyComponent() {
  return <ThemeToggle />;
}
```

### Theme Settings Panel

```tsx
import { ThemeSettings } from '@/components/ui/theme-settings';

function SettingsPage() {
  return <ThemeSettings />;
}
```

### Using Theme in Components

```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, actualTheme, setTheme } = useTheme();
  
  return (
    <div>
      <p>Current setting: {theme}</p>
      <p>Actual theme: {actualTheme}</p>
      <button onClick={() => setTheme('dark')}>
        Switch to Dark
      </button>
    </div>
  );
}
```

## Integration Points

### Navigation Bar
- Theme toggle button added to `ModernNavigation` component
- Always visible for easy access
- Positioned in the right side navigation area

### Settings Page
- New "Appearance" tab in Settings
- Comprehensive theme configuration panel
- Integrated with existing settings tabs

### App Initialization
- `ThemeProvider` wraps the entire application in `App.tsx`
- Theme initialization script in `index.html` prevents FOUC
- System theme detection on app startup

## Storage Schema

```typescript
// localStorage key: 'founder-lens-theme'
type StoredTheme = 'light' | 'dark' | 'system';
```

## Browser Support

- **Modern browsers**: Full support with CSS custom properties
- **Legacy browsers**: Graceful fallback to light theme
- **System detection**: Uses `prefers-color-scheme` media query
- **Storage**: Uses localStorage with fallback handling

## Accessibility Features

- **Screen readers**: Proper ARIA labels and descriptions
- **Keyboard navigation**: Full keyboard support for all controls
- **High contrast**: Maintained in both light and dark themes
- **Focus indicators**: Clear focus states for theme controls

## Performance Considerations

- **FOUC Prevention**: Inline script in HTML head applies theme immediately
- **Efficient Updates**: CSS custom properties enable instant theme switching
- **Minimal Bundle Size**: Lightweight implementation with no external dependencies
- **Memory Usage**: Optimized context updates and event listeners

## Testing

To test the theme system:

1. **Automatic Detection**: Clear localStorage and reload - should match system preference
2. **Manual Switching**: Use theme toggle in navigation or settings panel
3. **Persistence**: Reload page - theme should persist
4. **System Changes**: Change system theme while app is open - should update if set to "system"
5. **Accessibility**: Test with screen reader and keyboard navigation

## Troubleshooting

### Theme Not Applying
- Check if `ThemeProvider` wraps the app
- Verify CSS custom properties are defined
- Ensure Tailwind dark mode is configured

### FOUC (Flash of Unstyled Content)
- Verify theme initialization script is in HTML head
- Check localStorage permissions
- Ensure CSS loads before JavaScript

### System Detection Not Working
- Check browser support for `prefers-color-scheme`
- Verify media query listener is attached
- Test in different browsers

## Future Enhancements

- [ ] Additional theme variants (high contrast, sepia, etc.)
- [ ] Theme scheduling (automatic dark mode at night)
- [ ] Custom color scheme editor
- [ ] Theme sync across devices (with user accounts)
- [ ] Reduced motion preferences integration
