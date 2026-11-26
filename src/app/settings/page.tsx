'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/packages/ui/use-theme';
import type { ThemePreference } from '@/packages/ui/theme';
import { Button } from '@/packages/ui/button';
import { Field, Select } from '@/packages/ui/field';
import { Badge, Panel, PanelHeader } from '@/packages/ui/surface';
import { PageHeader } from '@/packages/ui/page';

export default function SettingsPage() {
  const { preference, setTheme } = useTheme();

  const handleThemeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(event.target.value as ThemePreference);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure your DevForge preferences. All settings are stored in your browser."
      />

      <Panel className="flex flex-col">
        <PanelHeader title="Theme" description="Choose how DevForge looks." />
        <div className="p-4">
          <Field label="Theme preference">
            <Select value={preference} onChange={handleThemeChange}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Field>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
              <Sun className="h-6 w-6 text-muted" aria-hidden />
              <span className="text-[11px] text-muted">Light</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
              <Monitor className="h-6 w-6 text-muted" aria-hidden />
              <span className="text-[11px] text-muted">System</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
              <Moon className="h-6 w-6 text-muted" aria-hidden />
              <span className="text-[11px] text-muted">Dark</span>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Your preference is saved in localStorage and applied on next visit.
          </p>
        </div>
      </Panel>

      <Panel className="flex flex-col">
        <PanelHeader title="Workspace" description="Your snippets, bookmarks, favorites and recents." />
        <div className="p-4">
          <p className="text-xs text-muted">
            Workspace data is stored in your browser's localStorage. Visit the{' '}
            <a href="/workspace" className="text-accent underline underline-offset-4">
              Workspace
            </a>{' '}
            page to manage snippets, bookmarks and export your data.
          </p>
        </div>
      </Panel>
    </div>
  );
}
