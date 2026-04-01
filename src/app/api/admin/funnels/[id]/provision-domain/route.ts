import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Hardcoded safety: only ever touches *.join.maxxedout.com
const PARENT_DOMAIN = 'maxxedout.com';
const SUBDOMAIN_PREFIX = 'join'; // records created as {slug}.join → {slug}.join.maxxedout.com

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'ADMIN') return null;
  return session;
}

// Validate subdomain slug: lowercase alphanumeric + hyphens only, 3-40 chars
function validateSubdomain(slug: string): string | null {
  const clean = slug.toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(clean)) {
    return null;
  }
  // Block anything that could escape the join.* namespace
  if (clean.includes('.') || clean.includes('/') || clean.includes('\\')) {
    return null;
  }
  return clean;
}

async function addGoDaddyCNAME(slug: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.GODADDY_API_KEY;
  const apiSecret = process.env.GODADDY_API_SECRET;
  if (!apiKey || !apiSecret) {
    return { ok: false, error: 'GoDaddy API credentials not configured' };
  }

  // SAFETY: only creates {slug}.join — cannot touch any other DNS records
  const recordName = `${slug}.${SUBDOMAIN_PREFIX}`;

  const res = await fetch(
    `https://api.godaddy.com/v1/domains/${PARENT_DOMAIN}/records/CNAME/${recordName}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `sso-key ${apiKey}:${apiSecret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify([{ data: 'cname.vercel-dns.com', ttl: 3600 }]),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('GoDaddy DNS error:', res.status, body);
    return { ok: false, error: `GoDaddy DNS failed (${res.status}): ${body}` };
  }

  return { ok: true };
}

async function addVercelDomain(slug: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_FUNNEL_PROJECT_ID;
  if (!token || !projectId) {
    return { ok: false, error: 'Vercel credentials not configured' };
  }

  // SAFETY: only adds {slug}.join.maxxedout.com — hardcoded suffix
  const domain = `${slug}.${SUBDOMAIN_PREFIX}.${PARENT_DOMAIN}`;

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/domains`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
    }
  );

  const body = await res.json();

  if (!res.ok) {
    // Domain might already exist — that's fine
    if (body?.error?.code === 'domain_already_in_use' || body?.error?.code === 'DOMAIN_ALREADY_EXISTS') {
      return { ok: true };
    }
    console.error('Vercel domain error:', res.status, body);
    return { ok: false, error: `Vercel domain failed: ${body?.error?.message || res.status}` };
  }

  return { ok: true };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const funnel = await prisma.funnelDeployment.findUnique({ where: { id } });
  if (!funnel) {
    return NextResponse.json({ error: 'Funnel not found' }, { status: 404 });
  }

  if (!funnel.subdomain) {
    return NextResponse.json({ error: 'No subdomain set on this funnel' }, { status: 400 });
  }

  const slug = validateSubdomain(funnel.subdomain);
  if (!slug) {
    return NextResponse.json({ error: 'Invalid subdomain format' }, { status: 400 });
  }

  // Check no other funnel uses this subdomain
  const existing = await prisma.funnelDeployment.findFirst({
    where: { subdomain: slug, id: { not: id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Subdomain already in use by another funnel' }, { status: 409 });
  }

  // Step 1: Add CNAME in GoDaddy
  const dnsResult = await addGoDaddyCNAME(slug);
  if (!dnsResult.ok) {
    return NextResponse.json({ error: dnsResult.error, step: 'dns' }, { status: 502 });
  }

  // Step 2: Add domain in Vercel
  const vercelResult = await addVercelDomain(slug);
  if (!vercelResult.ok) {
    return NextResponse.json({ error: vercelResult.error, step: 'vercel' }, { status: 502 });
  }

  // Step 3: Update funnel URL to the new subdomain
  const fullDomain = `${slug}.${SUBDOMAIN_PREFIX}.${PARENT_DOMAIN}`;
  await prisma.funnelDeployment.update({
    where: { id },
    data: {
      subdomain: slug,
      url: `https://${fullDomain}`,
    },
  });

  return NextResponse.json({
    success: true,
    domain: fullDomain,
    url: `https://${fullDomain}`,
    note: 'DNS may take a few minutes to propagate. SSL certificate will be issued automatically.',
  });
}
