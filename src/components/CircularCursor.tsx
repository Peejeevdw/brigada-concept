import { useEffect, useRef } from "react";

interface CircularCursorProps {
  text: string;
  active: boolean;
  diameter?: number;
  color?: string;
}

/**
 * Fixed-position element that follows the mouse with text arranged on a circle.
 * Uses rAF + lerp for smooth follow and a CSS rotation for the circling motion.
 */
const CircularCursor = ({
  text,
  active,
  diameter = 140,
  color = "#f3f2ef",
}: CircularCursorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -9999, y: -9999 });
  const current = useRef({ x: -9999, y: -9999 });
  const raf = useRef(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
      if (current.current.x < -1000) {
        current.current.x = e.clientX;
        current.current.y = e.clientY;
      }
    };
    const tick = () => {
      const el = ref.current;
      if (el) {
        current.current.x += (target.current.x - current.current.x) * 0.22;
        current.current.y += (target.current.y - current.current.y) * 0.22;
        el.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0) translate(-50%, -50%)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove);
    raf.current = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const r = diameter / 2 - 8;
  const repeated = `${text} ${text}`;

  return (
    <div
      ref={ref}
      aria-hidden
      className="fixed left-0 top-0 pointer-events-none z-[60] hidden md:block"
      style={{
        width: diameter,
        height: diameter,
        opacity: active ? 1 : 0,
        transition: "opacity 180ms ease",
        willChange: "transform, opacity",
        mixBlendMode: "difference",
      }}
    >
      <style>{`
        @keyframes cc-spin { to { transform: rotate(360deg); } }
        @media (hover: none) { .cc-root { display: none !important; } }
      `}</style>
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        style={{
          animation: "cc-spin 12s linear infinite",
          transformOrigin: "50% 50%",
        }}
      >
        <defs>
          <path
            id="cc-circle"
            d={`M ${diameter / 2}, ${diameter / 2} m -${r}, 0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`}
            fill="none"
          />
        </defs>
        <text
          fill={color}
          style={{
            fontFamily: "'Antarctica', system-ui, sans-serif",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          <textPath href="#cc-circle" startOffset="0">
            {repeated}
          </textPath>
        </text>
      </svg>
    </div>
  );
};

export default CircularCursor;
