import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { tools } from '@/packages/tool-sdk/registry';
import { toCatalogEntry } from '@/packages/tool-sdk/public';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DevForge — One platform. Every developer tool.',
    template: '%s · DevForge',
  },
  description:
    'A free, open-source, local-first developer workspace: code, Git, API, database, security, DevOps and frontend utilities with optional AI.',
  applicationName: 'DevForge',
  keywords: [
    'developer tools',
    'json formatter',
    'regex tester',
    'api client',
    'jwt decoder',
    'cron builder',
    'open source',
  ],
  authors: [{ name: 'DevForge contributors' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2ec' },
    { media: '(prefers-color-scheme: dark)', color: '#141311' },
  ],
};

const catalog = tools.map(toCatalogEntry);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AppShell catalog={catalog}>{children}</AppShell>
      </body>
    </html>
  );
}
