import { cn } from '@/lib/utils';

type AppGradientBackgroundProps = {
  className?: string;
  /** `subtle` for auth; `vivid` for landing; `app` for logged-in shell (landing-style + stronger gradient) */
  variant?: 'subtle' | 'vivid' | 'app';
  /** When true, background is confined to the parent container (main content area, not sidebar). */
  scoped?: boolean;
};

const WORKSPACE_STARS = [
  { top: '7%', left: '6%', size: 10, opacity: 0.28, rotate: 15 },
  { top: '12%', left: '22%', size: 6, opacity: 0.18, rotate: -20 },
  { top: '5%', left: '48%', size: 14, opacity: 0.42, rotate: 8 },
  { top: '9%', left: '72%', size: 8, opacity: 0.22, rotate: -12 },
  { top: '6%', left: '91%', size: 12, opacity: 0.35, rotate: 22 },
  { top: '28%', left: '14%', size: 8, opacity: 0.2, rotate: -8 },
  { top: '34%', left: '38%', size: 11, opacity: 0.3, rotate: 18 },
  { top: '22%', left: '58%', size: 7, opacity: 0.16, rotate: -25 },
  { top: '31%', left: '84%', size: 13, opacity: 0.38, rotate: 5 },
  { top: '52%', left: '4%', size: 9, opacity: 0.24, rotate: -15 },
  { top: '48%', left: '26%', size: 12, opacity: 0.32, rotate: 10 },
  { top: '56%', left: '52%', size: 7, opacity: 0.18, rotate: -18 },
  { top: '44%', left: '68%', size: 10, opacity: 0.26, rotate: 28 },
  { top: '53%', left: '88%', size: 8, opacity: 0.2, rotate: -6 },
  { top: '72%', left: '10%', size: 11, opacity: 0.3, rotate: 12 },
  { top: '68%', left: '32%', size: 7, opacity: 0.16, rotate: -22 },
  { top: '78%', left: '46%', size: 14, opacity: 0.4, rotate: -5 },
  { top: '74%', left: '64%', size: 9, opacity: 0.24, rotate: 20 },
  { top: '82%', left: '80%', size: 12, opacity: 0.34, rotate: -10 },
  { top: '88%', left: '18%', size: 8, opacity: 0.22, rotate: 16 },
  { top: '91%', left: '42%', size: 6, opacity: 0.15, rotate: -14 },
  { top: '86%', left: '94%', size: 10, opacity: 0.28, rotate: 8 },
] as const;

function FourPointStar({
  size,
  opacity,
  rotate,
  className,
}: {
  size: number;
  opacity: number;
  rotate: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn('text-[var(--star-glow)]', className)}
      style={{
        opacity,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <path
        d="M12 2L13.8 10.2L22 12L13.8 13.8L12 22L10.2 13.8L2 12L10.2 10.2L12 2Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function AppGradientBackground({
  className,
  variant = 'subtle',
  scoped = false,
}: AppGradientBackgroundProps) {
  const showOrbs = variant === 'vivid' || variant === 'app';
  const isApp = variant === 'app';

  const baseClass =
    variant === 'vivid'
      ? 'app-gradient-base--vivid'
      : variant === 'app'
        ? 'app-gradient-base--app'
        : 'app-gradient-base--subtle';

  return (
    <div
      className={cn(
        'pointer-events-none overflow-hidden',
        scoped ? 'absolute inset-0 z-0' : 'fixed inset-0 z-[-1]',
        baseClass,
        className
      )}
      aria-hidden
    >
      {showOrbs ? (
        <>
          <div
            className={cn(
              'absolute top-[-15%] left-1/2 -translate-x-1/2 rounded-full blur-[120px]',
              isApp
                ? 'h-[750px] w-[750px] bg-primary-blue/10 sm:h-[950px] sm:w-[950px]'
                : 'h-[700px] w-[700px] bg-primary-blue/8 sm:h-[900px] sm:w-[900px]'
            )}
          />
          <div
            className={cn(
              'absolute bottom-[-15%] right-[-10%] h-[500px] w-[500px] rounded-full blur-[120px]',
              isApp ? 'bg-[#2d2a5e]/18' : 'bg-primary-purple/8'
            )}
          />
          <div
            className={cn(
              'absolute top-1/2 left-[-10%] h-[400px] w-[400px] rounded-full blur-[100px]',
              isApp ? 'bg-primary-purple/10' : 'bg-primary-purple/5'
            )}
          />
        </>
      ) : null}
      <div
        className={cn(
          'absolute inset-0',
          isApp ? 'pattern-grid--app opacity-55' : 'pattern-grid',
          showOrbs ? (isApp ? '' : 'opacity-20') : 'opacity-[0.08]'
        )}
      />
      {isApp ? (
        <div className="absolute inset-0">
          {WORKSPACE_STARS.map((star, index) => (
            <div
              key={index}
              className="absolute"
              style={{ top: star.top, left: star.left }}
            >
              <FourPointStar
                size={star.size}
                opacity={star.opacity}
                rotate={star.rotate}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
