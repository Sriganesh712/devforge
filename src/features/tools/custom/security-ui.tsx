'use client';

import { useCallback, useMemo, useState } from 'react';
import { Shield, ShieldAlert } from 'lucide-react';
import type { ToolUiProps } from './types';
import { CodeBlock, CustomPanel, ToolErrorNote } from './shared';
import { Badge } from '@/packages/ui/surface';
import { Button } from '@/packages/ui/button';
import { CopyButton } from '@/packages/ui/copy-button';
import { Input } from '@/packages/ui/field';
import { Field } from '@/packages/ui/field';
import { cn } from '@/lib/utils';
import {
  decodeJwt,
  jwtSummary,
  verifyHmacJwt,
  estimatePassword,
  type PasswordEstimate,
} from '@/tools/security-tools/security';

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'The input could not be processed.';
}

/* ------------------------------------------------------------------ */
/* JWT decoder                                                        */
/* ------------------------------------------------------------------ */

export function JwtUi({ input, secondary, setSecondary }: ToolUiProps) {
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{ valid: boolean; algorithm: string; message: string } | null>(null);
  const [secretError, setSecretError] = useState<string | null>(null);

  const decoded = useMemo(() => {
    try {
      return { decoded: decodeJwt(input), error: null as string | null };
    } catch (caught) {
      return { decoded: null, error: errorMessage(caught) };
    }
  }, [input]);

  const { warnings } = decoded.decoded ? jwtSummary(decoded.decoded) : { warnings: [] };

  const verify = useCallback(async () => {
    if (!decoded.decoded) return;
    if (!secondary.trim()) {
      setSecretError('Enter an HMAC secret to verify.');
      return;
    }
    setVerifying(true);
    setSecretError(null);
    try {
      const result = await verifyHmacJwt(input, secondary);
      setVerification(result);
    } catch (caught) {
      setVerification(null);
      setSecretError(errorMessage(caught));
    } finally {
      setVerifying(false);
    }
  }, [input, secondary, decoded.decoded]);

  const hasSecret = Boolean(secondary.trim());

  return (
    <CustomPanel
      title="JWT decoder"
      description="Decodes the base64url header and payload. HMAC verification is explicit and local."
      actions={
        <div className="flex items-center gap-1.5">
          {decoded.decoded ? (
            <CopyButton
              value={JSON.stringify({ header: decoded.decoded.header, payload: decoded.decoded.payload }, null, 2)}
              label="Copy decoded"
              size="sm"
            />
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={verify}
            disabled={verifying || !decoded.decoded || !hasSecret}
          >
            {verifying ? 'Verifying…' : 'Verify HMAC'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {!decoded.decoded ? (
          <ToolErrorNote message={decoded.error ?? 'Could not decode this token.'} />
        ) : null}

        {decoded.decoded ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={decoded.decoded.header.alg === 'none' ? 'danger' : 'neutral'}>
                alg: {String(decoded.decoded.header.alg ?? 'none')}
              </Badge>
              <Badge tone={decoded.decoded.signature ? 'neutral' : 'danger'}>
                signature: {decoded.decoded.signature ? 'present' : 'missing'}
              </Badge>
              <Badge tone={warnings.length > 0 ? 'warn' : 'neutral'}>{warnings.length} warning(s)</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <section className="rounded-card border border-line bg-surface-2/50 p-3.5">
                <p className="mb-2 text-[11px] font-medium text-ink-2">Header</p>
                <CodeBlock
                  value={JSON.stringify(decoded.decoded.header, null, 2)}
                  language="json"
                  label="Copy header"
                />
              </section>
              <section className="rounded-card border border-line bg-surface-2/50 p-3.5">
                <p className="mb-2 text-[11px] font-medium text-ink-2">Payload</p>
                <CodeBlock
                  value={JSON.stringify(decoded.decoded.payload, null, 2)}
                  language="json"
                  label="Copy payload"
                />
              </section>
            </div>

            <section className="rounded-card border border-line bg-surface-2/50 p-3.5">
              <p className="mb-2 text-[11px] font-medium text-ink-2">Signature</p>
              <div className="flex items-start gap-2 px-3 py-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink-2">
                    {decoded.decoded.signature ? 'Present (not verified)' : 'Missing'}
                  </p>
                  <p className="text-[10px] text-muted">
                    Decoding alone never proves authenticity. Use the HMAC secret below to verify HS256/384/512 tokens.
                  </p>
                </div>
              </div>
            </section>

            {warnings.length > 0 ? (
              <section className="rounded-card border border-warn/25 bg-warn/5 px-3.5 py-3">
                <p className="mb-1.5 text-xs font-medium text-warn">Warnings</p>
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-2">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="rounded-card border border-line bg-surface p-3.5">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <Field label="HMAC secret" htmlFor="jwt-secret-input">
                  <Input
                    id="jwt-secret-input"
                    value={secondary}
                    type="password"
                    autoComplete="off"
                    placeholder="HS256/384/512 secret only"
                    onChange={(event) => setSecondary(event.target.value)}
                    disabled={!decoded.decoded}
                  />
                </Field>
                <span className="text-[10px] text-muted">
                  Only HS256/384/512 tokens can be verified here. RSA/EC tokens need the issuer’s public key.
                </span>
              </div>
              {secretError ? <ToolErrorNote message={secretError} /> : null}
              {verification ? (
                <div className={cn('rounded-card p-3 px-3.5 py-3', verification.valid ? 'border-ok/25 bg-ok/5' : 'border-danger/25 bg-danger/5')}>
                  <div className="flex items-center gap-2">
                    {verification.valid ? (
                      <Shield className="h-4 w-4 shrink-0 text-ok" aria-hidden />
                    ) : (
                      <ShieldAlert className="h-4 w-4 shrink-0 text-danger" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-ink-2">
                        {verification.valid ? 'Signature matches.' : 'Signature does not match.'}
                      </p>
                      <p className="text-[10px] text-muted">{verification.message}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </>
        ) : null}
      </div>
    </CustomPanel>
  );
}

/* ------------------------------------------------------------------ */
/* Password strength                                                  */
/* ------------------------------------------------------------------ */

const toneByScore: Record<PasswordEstimate['score'], 'neutral' | 'ok' | 'warn' | 'danger'> = {
  0: 'danger',
  1: 'danger',
  2: 'warn',
  3: 'ok',
  4: 'ok',
};

export function PasswordUi({ input }: ToolUiProps) {
  const estimate = useMemo(() => {
    try {
      return { estimate: estimatePassword(input), error: null as string | null };
    } catch (caught) {
      return { estimate: null, error: errorMessage(caught) };
    }
  }, [input]);

  return (
    <CustomPanel
      title="Password strength"
      description="Entropy and guess time estimated locally. The password never leaves this tab."
    >
      <div className="flex flex-col gap-3">
        {!estimate.estimate ? (
          <ToolErrorNote message={estimate.error ?? 'Could not estimate this password.'} />
        ) : null}

        {estimate.estimate ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] text-muted">Rating</p>
                <p className="text-3xl font-bold tabular-nums text-ink">
                  {estimate.estimate.label}
                </p>
                <span className="text-xs text-muted">Score {estimate.estimate.score} / 4</span>
              </div>
              <Badge tone={toneByScore[estimate.estimate.score]}>{estimate.estimate.score} / 4</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Entropy</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{estimate.estimate.entropy.toFixed(1)} bits</p>
              </div>
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Guess time @ 10B/s</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{estimate.estimate.crackTime}</p>
              </div>
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Length</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{input.length} chars</p>
              </div>
            </div>

            {estimate.estimate.advice.length > 0 ? (
              <section className="rounded-card border border-line bg-surface p-3.5">
                <p className="mb-2 text-[11px] font-medium text-ink-2">Advice</p>
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-2">
                  {estimate.estimate.advice.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="text-[10px] leading-relaxed text-muted">
              This is a heuristic estimate, not a guarantee. Never type a real production password into any web page.
            </p>
          </>
        ) : null}
      </div>
    </CustomPanel>
  );
}
