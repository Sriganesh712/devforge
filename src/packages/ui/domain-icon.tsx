import {
  Braces,
  Container,
  Database,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Library,
  PanelsTopLeft,
  Puzzle,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  Braces,
  Container,
  Database,
  Gauge,
  GitBranch,
  LayoutDashboard,
  Library,
  PanelsTopLeft,
  Puzzle,
  Radio,
  Server,
  ShieldCheck,
  Sparkles,
};

export function DomainIcon({
  name,
  className = 'h-4 w-4',
}: {
  name: string;
  className?: string;
}) {
  const Icon = icons[name] ?? Braces;
  return <Icon className={className} aria-hidden />;
}
