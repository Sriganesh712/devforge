import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';
import { PageHeader } from '@/packages/ui/page';
import { Badge } from '@/packages/ui/surface';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

function resolveDoc(slug: string[]): string | null {
  let candidate = path.join(DOCS_ROOT, ...slug);
  if (fs.existsSync(candidate + '.md')) return candidate + '.md';
  if (fs.existsSync(candidate + '/index.md')) return candidate + '/index.md';

  function tryCaseInsensitive(dir: string, remaining: string[]): string | null {
    if (remaining.length === 0) {
      if (fs.existsSync(dir + '.md')) return dir + '.md';
      if (fs.existsSync(path.join(dir, 'index.md'))) return path.join(dir, 'index.md');
      return null;
    }
    const [next, ...rest] = remaining;
    try {
      const entries = fs.readdirSync(dir);
      const match = entries.find((e) => e.toLowerCase() === next.toLowerCase());
      if (!match) return null;
      return tryCaseInsensitive(path.join(dir, match), rest);
    } catch {
      return null;
    }
  }

  return tryCaseInsensitive(DOCS_ROOT, slug);
}

function docTitle(slug: string[]): string {
  if (slug.length === 0) return 'Docs';
  return slug[slug.length - 1]
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface DocLink {
  href: string;
  title: string;
  description: string;
}

const docsIndex: DocLink[] = [
  {
    href: '/docs/getting-started',
    title: 'Getting Started',
    description: 'Install DevForge, run the dev server, and learn the available scripts',
  },
  {
    href: '/docs/security',
    title: 'Security Policy',
    description: 'Security design principles and how to report vulnerabilities',
  },
  {
    href: '/docs/development/implementation-status',
    title: 'Implementation Status',
    description: 'Current state of the project, completed work, and roadmap',
  },
];

function Breadcrumbs({ items }: { items: ReadonlyArray<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[10px] text-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? <ChevronRight className="h-3 w-3 text-line-strong" aria-hidden /> : null}
          {item.href ? (
            <Link href={item.href} className="transition-colors hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink-2">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function DocsIndex() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentation"
        description="Guides, security policy, and implementation status for DevForge."
      />
      <div className="divide-y divide-line rounded-card border border-line bg-surface p-0">
        {docsIndex.map((doc) => (
          <a
            key={doc.href}
            href={doc.href}
            className="flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-surface-2 transition-colors border-b border-line/50 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold text-ink">{doc.title}</h3>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink-2">{doc.description}</p>
            </div>
            <Badge tone="neutral">{doc.href.split('/').pop()}</Badge>
          </a>
        ))}
      </div>
    </div>
  );
}

interface DocsPageProps {
  params: Promise<{ slug?: string[] }>;
}

export async function generateMetadata({ params }: DocsPageProps): Promise<Metadata> {
  const resolved = await params;
  const slug: string[] = resolved.slug ?? [];
  const docPath = resolveDoc(slug);
  if (!docPath) {
    return { title: 'Not found', description: undefined };
  }
  const title = docTitle(slug);
  return { title, description: `${title} — DevForge documentation` };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const resolved = await params;
  const slug: string[] = resolved.slug ?? [];

  if (slug.length === 0) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[{ label: 'Docs' }]} />
        <PageHeader
          title="Documentation"
          description="Guides, security policy, and implementation status for DevForge."
        />
        <DocsIndex />
      </div>
    );
  }

  const docPath = resolveDoc(slug);
  if (!docPath) {
    notFound();
  }

  const source = fs.readFileSync(/*turbopackIgnore: true*/ docPath, 'utf-8');
  const rawHtml = marked.parse(source, { gfm: true, breaks: true }) as string;
  const html = rawHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  const title = docTitle(slug);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Docs', href: '/docs' }, { label: title }]} />
      <PageHeader
        eyebrow="Docs"
        title={title}
        description="Local-first documentation for DevForge."
      />
      <article className="max-w-2xl df-prose">
        <div className="prose prose-sm md:prose-base lg:prose-lg text-ink-2">
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-[12px] text-muted">This page is empty.</p>
          )}
        </div>
      </article>
    </div>
  );
}
