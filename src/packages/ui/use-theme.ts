'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  readThemePreference,
  resolveTheme,
  setThemePreference,
  THEME_EVENT,
  type ThemePreference,
} from './theme';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const next = readThemePreference();
      setPreference(next);
      setResolved(resolveTheme(next));
      applyTheme(next);
    };
    sync();
    setReady(true);

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onMedia = () => {
      if (readThemePreference() === 'system') sync();
    };
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener('storage', sync);
    media.addEventListener('change', onMedia);
    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener('storage', sync);
      media.removeEventListener('change', onMedia);
    };
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    setPreference(next);
    setResolved(resolveTheme(next));
  }, []);

  return { preference, resolved, ready, setTheme };
}
