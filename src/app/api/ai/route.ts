import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * AI gateway route.
 *
 * DevForge is BYO-key: the caller sends their API key with each request.
 * Keys are never stored or logged. Ollama is guarded to localhost (or an
 * explicit DEVFORGE_OLLAMA_HOST override) to avoid a public SSRF-like proxy.
 */

const ALLOWED_PROVIDERS = ['openai', 'groq', 'openrouter', 'ollama'] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

// Default Ollama host is localhost only. Override with DEVFORGE_OLLAMA_HOST
// if you run Ollama elsewhere in a controlled environment.
const DEFAULT_OLLAMA_HOST = 'http://127.0.0.1:11434';

function isOllamaHostAllowed(host: string): boolean {
  const allowed = process.env.DEVFORGE_OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
  try {
    const allowedUrl = new URL(allowed);
    const hostUrl = new URL(host);
    return allowedUrl.hostname === hostUrl.hostname && allowedUrl.port === hostUrl.port;
  } catch {
    return false;
  }
}

const requestSchema = z.object({
  provider: z.enum(ALLOWED_PROVIDERS),
  model: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().min(1),
    }),
  ),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(4096).optional(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parse = requestSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid request.', details: parse.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { provider, model, messages, temperature, maxTokens } = parse.data;

  // Read the API key from the Authorization header. Per-request only — never stored.
  const authHeader = request.headers.get('authorization') ?? '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) {
    return NextResponse.json({ error: 'Missing Authorization: Bearer <api-key> header.' }, { status: 401 });
  }
  const apiKey = bearerMatch[1];

  // Build the upstream request.
  let upstreamUrl: string;
  let upstreamHeaders: Record<string, string>;
  let upstreamBody: Record<string, unknown>;

  if (provider === 'ollama') {
    const ollamaHost = process.env.DEVFORGE_OLLAMA_HOST ?? DEFAULT_OLLAMA_HOST;
    if (!isOllamaHostAllowed(ollamaHost)) {
      return NextResponse.json(
        { error: 'Ollama host is not allowed. Set DEVFORGE_OLLAMA_HOST to an explicit host.' },
        { status: 403 },
      );
    }
    upstreamUrl = `${ollamaHost}/api/chat`;
    upstreamHeaders = {
      'Content-Type': 'application/json',
    };
    upstreamBody = {
      model,
      messages,
      stream: false,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { num_predict: maxTokens } : {}),
    };
  } else {
    // OpenAI, Groq, OpenRouter all use the OpenAI-compatible chat completions endpoint.
    const baseUrls: Record<Exclude<Provider, 'ollama'>, string> = {
      openai: 'https://api.openai.com/v1/chat/completions',
      groq: 'https://api.groq.com/openai/v1/chat/completions',
      openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    };
    upstreamUrl = baseUrls[provider];
    upstreamHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'DevForge' } : {}),
    };
    upstreamBody = {
      model,
      messages,
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxTokens !== undefined ? { max_tokens: maxTokens } : {}),
    };
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
    });
  } catch (error) {
    // Never echo the API key or raw error details to the client.
    return NextResponse.json({ error: 'Upstream request failed.' }, { status: 502 });
  }

  const responseBody = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    // Return a generic error without leaking upstream details or keys.
    return NextResponse.json(
      { error: `Upstream provider returned ${upstreamResponse.status}.` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, data: JSON.parse(responseBody) }, { status: 200 });
}
