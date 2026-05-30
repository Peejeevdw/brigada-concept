import { ElementType, useEffect, useLayoutEffect, useRef, useState } from "react";

interface LineRevealTextProps {
  as?: ElementType;
  text: string;
  className?: string;
  /** Delay (ms) added between each line. */
  stagger?: number;
  /** Per-line transition duration (ms). */
  duration?: number;
  /** Extra delay (ms) before the first line. */
  delay?: number;
  /** Trigger threshold (0-1) for IntersectionObserver. */
  threshold?: number;
}

/**
 * Reveals text line-by-line based on actual rendered wrapping.
 * Words are grouped by their offsetTop, then each group slides up
 * from below within an overflow-hidden mask.
 */
const LineRevealText = ({
  as: Tag = "p",
  text,
  className,
  stagger = 90,
  duration = 700,
  delay = 0,
  threshold = 0.2,
}: LineRevealTextProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [lines, setLines] = useState<string[]>([text]);
  const [revealed, setRevealed] = useState(false);

  const words = text.split(/\s+/).filter(Boolean);

  useLayoutEffect(() => {
    const measure = () => {
      const node = measureRef.current;
      if (!node) return;
      const wordEls = Array.from(
        node.querySelectorAll<HTMLSpanElement>("[data-word]")
      );
      if (!wordEls.length) return;
      const groups: string[][] = [];
      let currentTop: number | null = null;
      wordEls.forEach((el) => {
        const top = el.offsetTop;
        if (currentTop === null || Math.abs(top - currentTop) > 2) {
          groups.push([el.textContent || ""]);
          currentTop = top;
        } else {
          groups[groups.length - 1].push(el.textContent || "");
        }
      });
      const next = groups.map((g) => g.join(" "));
      setLines((prev) =>
        prev.length === next.length && prev.every((l, i) => l === next[i])
          ? prev
          : next
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [text]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [threshold]);

  return (
    <Tag ref={ref as never} className={className}>
      {/* Hidden measurement copy: same styles, but invisible and not interactive */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          width: "100%",
          left: 0,
          top: 0,
        }}
      >
        {words.map((w, i) => (
          <span key={i} data-word style={{ display: "inline-block" }}>
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        ))}
      </span>

      {lines.map((line, i) => (
        <span
          key={i}
          style={{
            display: "block",
            overflow: "hidden",
            paddingBottom: "0.15em",
            marginBottom: "-0.15em",
          }}
        >
          <span
            style={{
              display: "inline-block",
              transform: revealed ? "translateY(0)" : "translateY(110%)",
              transition: `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
              transitionDelay: `${delay + i * stagger}ms`,
              willChange: "transform",
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </Tag>
  );
};

export default LineRevealText;
