import { ImageResponse } from 'next/og';

/**
 * Link preview for /dd-leads — mirrors the page's card design so the sales
 * guy recognizes it when the link is texted to him. No live data here: the
 * page is password-gated, so the preview stays generic.
 */
export const alt = 'Medicaid DD Applications — Maxxed Out Sales';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#f2f2f7',
          padding: '56px 64px',
          fontFamily: 'Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#2563eb', letterSpacing: 4 }}>
            MAXXED OUT SALES
          </div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#111827', marginTop: 8 }}>
            Medicaid DD Applications
          </div>
          <div style={{ fontSize: 28, color: '#6b7280', marginTop: 8 }}>
            Live lead list · tap to call, text & send checkout links
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff',
            borderRadius: 28,
            border: '2px solid #e5e7eb',
            padding: '30px 34px',
            marginTop: 44,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#111827' }}>Jane Applicant</div>
            <div
              style={{
                display: 'flex',
                background: '#ecfdf5',
                color: '#047857',
                fontSize: 20,
                fontWeight: 800,
                padding: '8px 20px',
                borderRadius: 999,
              }}
            >
              App Complete
            </div>
          </div>
          <div style={{ display: 'flex', marginTop: 24, gap: 14 }}>
            <div
              style={{
                display: 'flex',
                flex: 3,
                alignItems: 'center',
                justifyContent: 'center',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 26,
                fontWeight: 800,
                borderRadius: 18,
                padding: '18px 0',
              }}
            >
              Call (937) 555-0142
            </div>
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                background: '#059669',
                color: '#ffffff',
                fontSize: 26,
                fontWeight: 800,
                borderRadius: 18,
                padding: '18px 0',
              }}
            >
              Text
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 36, alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              width: 18,
              height: 18,
              borderRadius: 999,
              background: '#2563eb',
            }}
          />
          <div style={{ fontSize: 24, color: '#9ca3af' }}>
            university.maxxedout.com/dd-leads · team password required
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
