'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { Button } from './button';

async function writeClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(area);
  if (!ok) throw new Error('Clipboard access was denied by the browser.');
}

export function CopyButton({
  value,
  label = 'Copy',
  size = 'sm',
  variant = 'secondary',
  disabled,
}: {
  value: string;
  label?: string;
  size?: 'sm' | 'md' | 'icon';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(async () => {
    try {
      await writeClipboard(value);
      setState('copied');
    } catch {
      setState('error');
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  }, [value]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={copy}
      disabled={disabled || !value}
      aria-label={label}
      title={label}
    >
      {state === 'copied' ? (
        <Check className="h-3.5 w-3.5 text-ok" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {size !== 'icon' ? (
        <span>{state === 'copied' ? 'Copied' : state === 'error' ? 'Copy failed' : label}</span>
      ) : null}
    </Button>
  );
}

export function DownloadButton({
  value,
  filename,
  mime = 'text/plain',
  label = 'Download',
}: {
  value: string;
  filename: string;
  mime?: string;
  label?: string;
}) {
  const download = useCallback(() => {
    const blob = new Blob([value], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [value, filename, mime]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={download}
      disabled={!value}
      aria-label={label}
      title={label}
    >
      <Download className="h-3.5 w-3.5" />
      <span>{label}</span>
    </Button>
  );
}
