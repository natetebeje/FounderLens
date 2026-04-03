import React from 'react';
import { Moon, Sun, Monitor, Palette, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Label } from './label';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeSettings: React.FC = () => {
  const { theme, setTheme, actualTheme } = useTheme();

  const themeOptions = [
    {
      value: 'light',
      label: 'Light',
      description: 'Clean and bright interface',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'System',
      description: 'Follows your device settings',
      icon: Monitor,
    },
  ] as const;

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Settings
        </CardTitle>
        <CardDescription>
          Choose your preferred appearance. Your selection will be saved automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={theme}
          onValueChange={(value) => setTheme(value as 'light' | 'dark' | 'system')}
          className="space-y-3"
        >
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = theme === option.value;
            const isActive = actualTheme === option.value || 
              (option.value === 'system' && theme === 'system');

            return (
              <div
                key={option.value}
                className={`relative flex items-center space-x-3 rounded-lg border p-4 transition-all hover:bg-accent/50 ${
                  isSelected ? 'border-primary bg-accent/20' : 'border-border'
                }`}
              >
                <RadioGroupItem
                  value={option.value}
                  id={option.value}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                    {isActive && theme !== 'system' && (
                      <Check className="h-3 w-3 text-primary" />
                    )}
                    {theme === 'system' && (
                      <span className="text-xs text-muted-foreground">
                        ({actualTheme})
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </div>
              </div>
            );
          })}
        </RadioGroup>
        
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Current theme:</strong> {actualTheme === 'dark' ? 'Dark' : 'Light'}
            {theme === 'system' && ' (Auto)'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your preference is saved locally and will persist across sessions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
