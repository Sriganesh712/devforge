'use client';

import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { useTheme } from './use-theme';

export { THEME_KEY } from './theme';

export function ThemeToggle() {
  const { resolved, ready, setTheme } = useTheme();
  const next = resolved === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={ready ? `Switch to ${next} theme` : 'Toggle theme'}
      title={ready ? `Switch to ${next} theme` : 'Toggle theme'}
    >
      {ready && resolved === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  );
}
