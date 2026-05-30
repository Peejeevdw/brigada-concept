import { CSSProperties, forwardRef, useId } from "react";

interface GrainOverlayProps {
  /** Initial opacity. Override at runtime by mutating ref.current.style.opacity. */
  opacity?: number;
  /** mix-blend-mode for the overlay. Defaults to "overlay" for filmic noise. */
  blendMode?: CSSProperties["mixBlendMode"];
  /** Tailwind / utility classes. */
  className?: string;
  /** Inline style overrides (merged after defaults). */
  style?: CSSProperties;
}

/**
 * Reusable monochrome film-grain overlay built from an SVG `feTurbulence`
 * fractalNoise filter (matches the brio noise look). Drop it inside a
 * `position: relative` parent.
 */
const GrainOverlay = forwardRef<HTMLDivElement, GrainOverlayProps>(
  ({ opacity = 0, blendMode = "overlay", className, style }, ref) => {
    const rawId = useId().replace(/:/g, "");
    const fid = `grain-noise-${rawId}`;
    return (
      <div
        ref={ref}
        aria-hidden
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity,
          mixBlendMode: blendMode,
          ...style,
        }}
      >
        <svg
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          style={{ display: "block", width: "100%", height: "100%" }}
        >
          <filter id={fid} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.4"
              numOctaves="2"
              stitchTiles="stitch"
              seed="7"
              result="noise"
            />
            {/* High-contrast grayscale noise centered on mid-gray. With
                `mix-blend-mode: overlay` this strongly modulates highlights
                and shadows of the underlying footage, so it reads as baked-in
                grain rather than a flat layer on top. */}
            <feColorMatrix
              in="noise"
              type="matrix"
              values="3 0 0 0 -1
                      0 3 0 0 -1
                      0 0 3 0 -1
                      0 0 0 0 1"
            />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${fid})`} />
        </svg>
      </div>
    );
  },
);
GrainOverlay.displayName = "GrainOverlay";

export default GrainOverlay;
