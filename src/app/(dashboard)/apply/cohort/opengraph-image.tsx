import { ImageResponse } from 'next/og';

/**
 * Link preview for the cohort application.
 *
 * This URL gets dropped into Zoom chat live during the class, so the unfurl is
 * the first thing hundreds of people see. Without this the page inherited the
 * site-wide card ("Training Center | MaxxedOut"), which said nothing about
 * applying. Generated rather than a static asset so the copy stays in sync
 * with the page.
 */
export const runtime = 'nodejs';
export const alt = 'Apply for the 12-Week Cohort — Maxxed Out';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The LIGHT logo variant (the one AdminHeader uses on its dark bar) — the
 * site-header version is near-black and would disappear on this navy card.
 */
const LOGO_URL =
  'https://storage.googleapis.com/msgsndr/ZTzlr9OKa82mgQ8vn680/media/69277b484ee4a3826c4e244a.png';

/**
 * Inlined as a data URI rather than passed as a remote src: the OG renderer
 * fetches at request time, and a slow/failed CDN call would otherwise produce
 * a card with a missing logo. Returns null on failure so we fall back to the
 * wordmark instead of rendering a broken image.
 */
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch(LOGO_URL, { cache: 'force-cache' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image() {
  const logo = await loadLogo();

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #070B15 0%, #0B1C4D 55%, #041030 100%)',
          padding: '68px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Brand + urgency */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logo ? (
              // Explicit width AND height at the source's 2.526:1 ratio — left to
              // infer it, Satori scaled the 15000px-wide original and aliased badly.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="Maxxed Out" width={202} height={80} style={{ objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontSize: 34,
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: 2,
                }}
              >
                MAXXED OUT
              </div>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: 20,
              fontWeight: 800,
              letterSpacing: 3,
              padding: '10px 22px',
              borderRadius: 999,
            }}
          >
            LIMITED SEATS
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 82,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Apply for the
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 82,
              fontWeight: 900,
              color: '#60a5fa',
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            12-Week Cohort
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 26,
              fontSize: 30,
              color: 'rgba(255,255,255,0.75)',
              lineHeight: 1.35,
            }}
          >
            Takes about 2 minutes. Todd and his team are calling applicants tonight.
          </div>
        </div>

        {/* Footer bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.5)' }}>
            Hosted by Todd Pultz
          </div>
          <div
            style={{
              display: 'flex',
              background: '#ffffff',
              color: '#0B1C4D',
              fontSize: 26,
              fontWeight: 900,
              padding: '16px 34px',
              borderRadius: 14,
            }}
          >
            Submit My Application →
          </div>
        </div>
      </div>
    ),
    size
  );
}
