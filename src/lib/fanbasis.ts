import crypto from 'crypto';

const FANBASIS_API_KEY = process.env.FANBASIS_API_KEY;
const FANBASIS_BASE_URL = process.env.FANBASIS_BASE_URL || 'https://www.fanbasis.com/public-api';

export function getFanbasisConfig() {
  if (!FANBASIS_API_KEY) {
    throw new Error('FANBASIS_API_KEY environment variable is not set');
  }
  return { apiKey: FANBASIS_API_KEY, baseUrl: FANBASIS_BASE_URL };
}

async function fanbasisFetch(path: string, options: RequestInit = {}) {
  const { apiKey, baseUrl } = getFanbasisConfig();
  const url = `${baseUrl}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'x-api-key': apiKey,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok || data.status === 'error') {
    throw new Error(data.message || `Fanbasis API error (${res.status})`);
  }

  return data;
}

export interface CreateCheckoutSessionParams {
  title: string;
  description?: string;
  amountCents: number;
  type: 'onetime_non_reusable' | 'onetime_reusable' | 'subscription';
  successUrl: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams) {
  const body: Record<string, unknown> = {
    product: {
      title: params.title,
      description: params.description ?? null,
    },
    amount_cents: params.amountCents,
    type: params.type,
    success_url: params.successUrl,
  };

  if (params.webhookUrl) body.webhook_url = params.webhookUrl;
  if (params.metadata) body.metadata = params.metadata;

  const data = await fanbasisFetch('/checkout-sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return data.data as {
    checkout_session_id: number;
    payment_link: string;
  };
}

export function validateWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
