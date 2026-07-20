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

export default async function Image() {
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
