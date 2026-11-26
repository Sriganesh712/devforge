import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn('inline-flex items-center gap-2 rounded-control', className)}
      aria-label="DevForge home"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" aria-hidden fill="none">
        <path
          d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <rect x="10" y="10" width="4" height="4" rx="0.5" fill="var(--df-accent)" />
      </svg>
      {compact ? null : (
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-ink">DevForge</span>
      )}
    </Link>
  );
}
