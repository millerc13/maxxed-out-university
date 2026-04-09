const POSTHOG_HOST = 'https://us.posthog.com';

export function subdomainToProgram(subdomain: string | null): string {
  if (!subdomain) return 'Unknown';
  if (subdomain.includes('blueprint')) return 'Real Estate Blueprint';
  if (subdomain.includes('donewithyou')) return 'Done With You';
  if (subdomain.includes('mentorship')) return 'Mentorship';
  return 'Unknown';
}

export async function queryPostHog(hogql: string): Promise<{ results: unknown[][]; columns: string[] }> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) {
    return { results: [], columns: [] };
  }

  const res = await fetch(`${POSTHOG_HOST}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: { kind: 'HogQLQuery', query: hogql },
    }),
    next: { revalidate: 300 },
  });

  if (!res.ok) return { results: [], columns: [] };
  const data = await res.json();
  return { results: data.results ?? [], columns: data.columns ?? [] };
}

export async function listRecordings(subdomain: string, limit = 10): Promise<{
  results: Array<{
    id: string;
    distinct_id: string;
    start_time: string;
    recording_duration: number;
    click_count: number;
    keypress_count: number;
  }>;
}> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return { results: [] };

  const filter = encodeURIComponent(JSON.stringify([
    { key: '$current_url', value: subdomain, operator: 'icontains', type: 'event' },
  ]));

  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${projectId}/session_recordings?properties=${filter}&date_from=-7d&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) return { results: [] };
  return res.json();
}

export async function enableRecordingSharing(recordingId: string): Promise<string | null> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${projectId}/session_recordings/${recordingId}/sharing`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token ?? null;
}
