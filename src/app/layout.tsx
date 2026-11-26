import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import Script from 'next/script';
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

const themeScript = `(function(){try{var t=localStorage.getItem('df:theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

const catalog = tools.map(toCatalogEntry);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body>
        <AppShell catalog={catalog}>{children}</AppShell>
      </body>
    </html>
  );
}
