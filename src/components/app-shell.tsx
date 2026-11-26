'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  BookOpen,
  LayoutDashboard,
  LayoutGrid,
  Library,
  Menu,
  Puzzle,
  Settings,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { domains } from '@/packages/tool-sdk/domains';
import type { CatalogEntry } from '@/packages/tool-sdk/public';
import { DomainIcon } from '@/packages/ui/domain-icon';
import { Logo } from '@/packages/ui/logo';
import { ThemeToggle } from '@/packages/ui/theme-toggle';
import { SearchDialog } from '@/features/search/search-dialog';
import { cn } from '@/lib/utils';

const toolDomains = domains.filter((domain) => domain.kind === 'tools');
const surfaces = domains.filter((domain) => domain.kind === 'surface');

function NavRow({
  href,
  label,
  icon,
  index,
  active,
  onClick,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  index?: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-8 items-center gap-2.5 rounded-control px-2 text-[13px] transition-colors',
        active
          ? 'bg-surface-2 font-medium text-ink'
          : 'text-ink-2 hover:bg-surface-2/70 hover:text-ink',
      )}
    >
      {active ? (
        <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-accent" aria-hidden />
      ) : null}
      <span className={cn('shrink-0', active ? 'text-ink' : 'text-muted')}>{icon}</span>
      <span className="truncate">{label}</span>
      {index ? (
        <span className="ml-auto font-mono text-[10px] tabular-nums text-muted/70">{index}</span>
      ) : null}
    </Link>
  );
}

function GroupLabel({ children }: { children: ReactNode }) {
  return <p className="mb-1 mt-5 px-2 text-[11px] font-medium text-muted first:mt-2">{children}</p>;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <Logo />
        <span className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          v0.1
        </span>
      </div>

      <nav className="df-scroll flex-1 overflow-y-auto px-2 pb-4" aria-label="Main navigation">
        <div className="pt-3">
          <NavRow
            href="/"
            label="Overview"
            icon={<LayoutDashboard className="h-4 w-4" aria-hidden />}
            active={isActive('/')}
            onClick={onNavigate}
          />
        </div>

        <GroupLabel>Tools</GroupLabel>
        <div className="flex flex-col gap-0.5">
          <NavRow
            href="/tools"
            label="All tools"
            icon={<LayoutGrid className="h-4 w-4" aria-hidden />}
            active={pathname === '/tools'}
            onClick={onNavigate}
          />
          {toolDomains.map((domain) => (
            <NavRow
              key={domain.id}
              href={domain.href}
              label={domain.shortName}
              icon={<DomainIcon name={domain.icon} />}
              index={domain.index}
              active={isActive(domain.href)}
              onClick={onNavigate}
            />
          ))}
        </div>

        <GroupLabel>Studio</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {surfaces.map((domain) => (
            <NavRow
              key={domain.id}
              href={domain.href}
              label={domain.shortName}
              icon={
                domain.id === 'ai' ? (
                  <Sparkles className="h-4 w-4" aria-hidden />
                ) : domain.id === 'workspace' ? (
                  <Library className="h-4 w-4" aria-hidden />
                ) : (
                  <Puzzle className="h-4 w-4" aria-hidden />
                )
              }
              index={domain.index}
              active={isActive(domain.href)}
              onClick={onNavigate}
            />
          ))}
        </div>

        <GroupLabel>Resources</GroupLabel>
        <div className="flex flex-col gap-0.5">
          <NavRow
            href="/community"
            label="Community"
            icon={<Users className="h-4 w-4" aria-hidden />}
            active={isActive('/community')}
            onClick={onNavigate}
          />
          <NavRow
            href="/docs"
            label="Documentation"
            icon={<BookOpen className="h-4 w-4" aria-hidden />}
            active={isActive('/docs')}
            onClick={onNavigate}
          />
          <NavRow
            href="/settings"
            label="Settings"
            icon={<Settings className="h-4 w-4" aria-hidden />}
            active={isActive('/settings')}
            onClick={onNavigate}
          />
        </div>
      </nav>

      <div className="border-t border-line px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted">
          Local-first. Apache-2.0.
          <br />
          <Link
            href="/docs/development/implementation-status"
            className="text-ink-2 underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
          >
            Alpha status
          </Link>
        </p>
      </div>
    </>
  );
}

export function AppShell({
  catalog,
  children,
}: {
  catalog: readonly CatalogEntry[];
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-bg">
      <a
        href="#main"
        className="sr-only z-[60] rounded-control bg-surface px-3 py-2 text-sm text-ink focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:border focus:border-line-strong"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-bg lg:flex">
        <SidebarContent />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col border-r border-line bg-bg">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-control text-muted hover:bg-surface-2 hover:text-ink"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-bg/90 px-3 backdrop-blur sm:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-control text-ink-2 hover:bg-surface-2 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <SearchDialog catalog={catalog} />
            <Link
              href="/docs"
              className="hidden h-8 items-center rounded-control px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink md:inline-flex"
            >
              Docs
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
