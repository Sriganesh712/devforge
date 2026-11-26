import type { Metadata } from 'next';
import { GitBranch, Mail, FileText, Users } from 'lucide-react';
import { Button } from '@/packages/ui/button';
import { Badge, Panel, PanelHeader } from '@/packages/ui/surface';
import { PageHeader } from '@/packages/ui/page';

export const metadata: Metadata = {
  title: 'Community',
  description: 'Connect with DevForge contributors and get help.',
};

export default function CommunityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Community"
        description="Connect with DevForge contributors, get help, and contribute."
      />

      <Panel className="flex flex-col">
        <PanelHeader title="Get involved" description="Ways to participate in DevForge." />
        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <GitBranch className="mt-0.5 h-4 w-4 text-ink-2" aria-hidden />
            <div>
              <h3 className="text-sm font-medium text-ink">GitHub repository</h3>
              <p className="text-xs text-muted">
                Browse the source, open issues, and submit pull requests.
              </p>
              <a
                href="https://github.com/sriganesh712/devforge"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-4 text-sm"
              >
                View on GitHub
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-4 w-4 text-ink-2" aria-hidden />
            <div>
              <h3 className="text-sm font-medium text-ink">Contributing</h3>
              <p className="text-xs text-muted">
                Read the contribution guide to learn how to add tools, improve docs, and more.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 text-ink-2" aria-hidden />
            <div>
              <h3 className="text-sm font-medium text-ink">Discuss</h3>
              <p className="text-xs text-muted">
                Join the conversation about features, bugs, and roadmap.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="flex flex-col">
        <PanelHeader title="Project" description="DevForge at a glance." />
        <div className="p-4 grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
            <Badge tone="accent">51</Badge>
            <span className="text-[11px] text-muted">tools</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
            <Badge>9</Badge>
            <span className="text-[11px] text-muted">categories</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 rounded-card border border-line bg-surface">
            <Badge>Apache-2.0</Badge>
            <span className="text-[11px] text-muted">license</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}
