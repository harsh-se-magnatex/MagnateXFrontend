import { ImageResponse } from 'next/og';

/**
 * The shared 1200×630 share card for marketing routes. Each route's
 * `opengraph-image.tsx` calls this with its own eyebrow and headline, so
 * every link preview carries a readable headline instead of a lone logo.
 *
 * `next/og` renders a flexbox subset of CSS with inline styles only, so the
 * brand tokens are repeated here as literals.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export function ogCard({
  eyebrow,
  headline,
  accent,
  footer = 'Instagram · Facebook · LinkedIn',
}: {
  eyebrow: string;
  headline: string;
  /** Painted in the brand gradient on its own line under the headline. */
  accent: string;
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          // Satori rejects a colour layer inside `background`, so the
          // ground colour and the washes are set separately.
          backgroundColor: '#090b10',
          backgroundImage:
            'radial-gradient(ellipse 70% 60% at 15% 0%, rgba(88,101,242,0.35), transparent 60%), radial-gradient(ellipse 60% 55% at 95% 100%, rgba(232,97,140,0.28), transparent 60%)',
          color: '#f1f5f9',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundImage:
                'linear-gradient(135deg, #4f8cff, #7c3aed 55%, #e8618c)',
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            SocioGenie
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 22,
              textTransform: 'uppercase',
              letterSpacing: 2,
              color: '#c4b1fd',
              marginBottom: 24,
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -3,
              maxWidth: 1000,
            }}
          >
            {headline}
          </div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: -3,
              backgroundImage: 'linear-gradient(90deg, #8fb6ff, #c4b1fd 45%, #ffa3c0)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {accent}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 24,
            color: '#94a3b8',
          }}
        >
          <div>{footer}</div>
          <div>sociogenie.ai</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
