import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import fs from 'node:fs';
import path from 'node:path';
import { PageHeader } from '@/packages/ui/page';

const DOCS_ROOT = path.join(process.cwd(), 'docs');

function resolveDoc(slug: string[]): string | null {
  // Try exact path first
  let candidate = path.join(DOCS_ROOT, ...slug);
  if (fs.existsSync(candidate + '.md')) return candidate + '.md';
  if (fs.existsSync(candidate + '/index.md')) return candidate + '/index.md';

  // Try case-insensitive match for each segment
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
  const docPath = resolveDoc(slug);

  if (!docPath) {
    notFound();
  }

  const source = fs.readFileSync(/*turbopackIgnore: true*/ docPath, 'utf-8');
  const rawHtml = marked.parse(source, { gfm: true, breaks: true }) as string;
  // Strip script tags so React can safely render via dangerouslySetInnerHTML.
  const html = rawHtml.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  const title = docTitle(slug);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Docs"
        title={title}
        description="Local-first documentation for DevForge."
      />
      <article className="df-prose max-w-none">
        <div
          className="prose prose-sm md:prose-base lg:prose-lg xl:prose-xl text-ink-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </article>
    </div>
  );
}
