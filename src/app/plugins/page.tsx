'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Code2, FileText, FileUp } from 'lucide-react';
import { validatePluginManifest } from '@/packages/tool-sdk/plugin';
import { Button } from '@/packages/ui/button';
import { Field, Input, Textarea } from '@/packages/ui/field';
import { Badge, EmptyState, Panel, PanelHeader } from '@/packages/ui/surface';
import { PageHeader } from '@/packages/ui/page';

export default function PluginsPage() {
  const [manifestText, setManifestText] = useState('');
  const [result, setResult] = useState<{ ok: boolean; errors?: string[]; manifest?: any } | null>(null);

  const handleValidate = () => {
    if (!manifestText.trim()) {
      setResult(null);
      return;
    }
    const validation = validatePluginManifest(manifestText);
    setResult(validation);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setManifestText(reader.result as string);
      handleValidate();
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Plugin Ecosystem"
        description="Validate a DevForge plugin manifest. Plugins are declarative manifests only — no third-party code execution."
      />

      <Panel className="flex flex-col">
        <PanelHeader
          title="Plugin manifest validator"
          description="Paste a plugin manifest JSON or upload a .json file to validate it against the DevForge plugin schema."
        />
        <div className="p-4">
          <Field label="Plugin manifest JSON">
            <Textarea
              value={manifestText}
              placeholder='{
  "apiVersion": "devforge.dev/v1",
  "id": "com.example.toolpack",
  "name": "Example Tool Pack",
  "version": "1.0.0",
  "description": "A set of example tools for DevForge.",
  "author": "Example Author",
  "license": "MIT",
  "category": "code",
  "permissions": ["clipboard.write"],
  "tools": [
    {
      "id": "example-tool",
      "name": "Example Tool",
      "summary": "An example tool.",
      "kind": "first-party",
      "toolId": "json-formatter"
    }
  ]
}'
              rows={14}
              onChange={(event) => setManifestText(event.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3 mt-3">
            <Button type="button" variant="primary" onClick={handleValidate}>
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Validate manifest
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('manifest-file')?.click()}
            >
              <FileUp className="h-3.5 w-3.5" aria-hidden />
              Upload file
            </Button>
            <input
              id="manifest-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </Panel>

      {result ? (
        <Panel className="flex flex-col">
          <PanelHeader
            title={result.ok ? 'Manifest is valid' : 'Manifest has errors'}
            description={result.ok ? 'This manifest conforms to the DevForge plugin schema.' : 'Fix the errors below before submitting.'}
            actions={
              <Badge tone={result.ok ? 'ok' : 'danger'}>
                {result.ok ? 'Valid' : 'Invalid'}
              </Badge>
            }
          />
          <div className="p-4">
            {result.ok ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />
                <p className="text-sm text-ink">
                  Ready to submit. Share this manifest with the DevForge maintainers for review.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-ink mb-3">Errors:</p>
                <ul className="list-disc space-y-2 pl-5 text-sm text-ink-2">
                  {(result.errors ?? []).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Panel>
      ) : manifestText.trim() !== '' ? (
        <EmptyState title="No validation yet" description="Paste a manifest and choose Validate manifest." />
      ) : null}

      <Panel className="flex flex-col">
        <PanelHeader title="About the plugin system" description="How DevForge plugins work." />
        <div className="p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink">Declarative manifests only</p>
              <p className="text-xs text-muted">
                Plugins describe external tools or reference existing first-party tools. They cannot execute
                arbitrary JavaScript inside DevForge.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink">Reviewed submission path</p>
              <p className="text-xs text-muted">
                Manifests are reviewed by maintainers before being added to the registry. No automatic
                publishing or installation.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-ink">Limited permissions</p>
              <p className="text-xs text-muted">
                Permissions are scoped to clipboard.write, network.user-initiated and workspace.local.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
