import { NextRequest, NextResponse } from 'next/server';
import { sessionWithCapability, unauthorized } from '@/lib/api-auth';

/**
 * Server-side proxy for the webinar admin.
 *
 * The webinar admin UI lives in this repo (src/components/webinar-admin/*) but
 * ALL of its data still comes from the separate maxxed-webinar app's existing
 * admin APIs. Those APIs authenticate with a bearer token (ADMIN_TOKEN). We
 * never expose that token to the browser — the client hits this same-origin
 * proxy, we verify the university session + capability, then forward the
 * request to `${WEBINAR_APP_URL}/api/<path>` with the bearer injected.
 *
 * Everything the upstream returns (JSON, text/csv, etc.) passes back verbatim.
 * The request body is streamed (duplex: 'half') so multipart uploads work.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = process.env.WEBINAR_APP_URL;
const TOKEN = process.env.WEBINAR_ADMIN_TOKEN;

// Request headers we must not forward: host/connection are hop-by-hop, cookie +
// authorization are university-session secrets that have no business reaching
// the webinar app (we inject our own Authorization below).
const STRIP_REQ = new Set([
  'host',
  'connection',
  'content-length',
  'cookie',
  'authorization',
  'accept-encoding',
]);
// Response headers that would corrupt the re-emitted body if copied verbatim.
const STRIP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection']);

async function proxy(req: NextRequest, path: string[]) {
  // Editor capability required for every verb (reads + writes). ADMIN + INSTRUCTOR.
  const session = await sessionWithCapability('content:manage');
  if (!session) return unauthorized();

  if (!BASE || !TOKEN) {
    return NextResponse.json(
      { error: 'Webinar proxy is not configured (WEBINAR_APP_URL / WEBINAR_ADMIN_TOKEN missing).' },
      { status: 500 },
    );
  }

  const target = `${BASE}/api/${path.join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQ.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set('authorization', `Bearer ${TOKEN}`);

  const method = req.method.toUpperCase();
  const init: RequestInit & { duplex?: 'half' } = { method, headers, redirect: 'manual' };
  if (method !== 'GET' && method !== 'HEAD' && req.body) {
    init.body = req.body;
    init.duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return NextResponse.json(
      { error: `Webinar app unreachable: ${err instanceof Error ? err.message : 'unknown error'}` },
      { status: 502 },
    );
  }

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIP_RES.has(key.toLowerCase())) resHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, (await ctx.params).path);
}
