import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Studio',
  description:
    'Optional, bring-your-own-key AI assistance. Every deterministic tool works without it.',
};

export default function AIPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-card border border-line bg-surface p-8">
        <h1 className="text-[22px] font-semibold text-ink sm:text-3xl">AI Studio</h1>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ink-2">
          Optional, bring-your-own-key AI assistance. Every deterministic tool works without it.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-[15px] font-semibold text-ink">Status</h2>
        <p className="mt-1 text-xs text-muted">
          The AI Studio domain is planned but the API gateway route ({'/api/ai'}) has not been
          implemented yet. When built, it will support OpenAI, Groq, OpenRouter and Ollama
          providers with your own API key — keys are never stored or logged.
        </p>
      </div>

      <div className="rounded-card border border-warn/25 bg-warn/5 p-6">
        <h2 className="text-[15px] font-semibold text-warn">Security</h2>
        <ul className="mt-2 space-y-1 text-sm text-ink-2 list-disc pl-5">
          <li>API keys are per-request only — never stored or logged.</li>
          <li>Ollama is guarded to localhost (or explicit env override) to prevent SSRF.</li>
          <li>Provider allowlist prevents arbitrary endpoint access.</li>
          <li>All deterministic tools work without AI.</li>
        </ul>
      </div>
    </div>
  );
}
