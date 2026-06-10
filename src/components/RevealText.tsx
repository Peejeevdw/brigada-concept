import { ElementType, useEffect, useLayoutEffect, useRef, useState } from "react";

interface RevealTextProps {
  as?: ElementType;
  text: string;
  className?: string;
  /** Delay (ms) added between each line. */
  stagger?: number;
  /** Per-line transition duration (ms). */
  duration?: number;
  /** Trigger threshold (0-1) for IntersectionObserver. */
  threshold?: number;
  /** Delay (ms) before the first line starts (added to every line). */
  startDelay?: number;
}

/**
 * Line-by-line reveal: words are wrapped in masks but grouped by their
 * rendered offsetTop, so each visual line slides up together.
 */
const RevealText = ({
  as: Tag = "h2",
  text,
  className,
  stagger = 90,
  duration = 700,
  threshold = 0.2,
  startDelay = 0,
}: RevealTextProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [lineMap, setLineMap] = useState<number[]>([]);

  const tokens = text.split(/(\s+)/);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

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

  useLayoutEffect(() => {
    const compute = () => {
      const els = wordRefs.current.filter(Boolean) as HTMLSpanElement[];
      if (!els.length) return;
      const tops: number[] = [];
      const map = els.map((el) => {
        const top = el.offsetTop;
        let idx = tops.findIndex((t) => Math.abs(t - top) < 2);
        if (idx === -1) {
          tops.push(top);
          idx = tops.length - 1;
        }
        return idx;
      });
      setLineMap((prev) =>
        prev.length === map.length && prev.every((v, i) => v === map[i]) ? prev : map
      );
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [text]);

  let wordCounter = 0;

  return (
    <Tag ref={ref as never} className={className}>
      {tokens.map((w, i) => {
        if (/^\s+$/.test(w) || w === "") return <span key={i}>{w}</span>;
        const wIdx = wordCounter++;
        const lineIdx = lineMap[wIdx] ?? 0;
        return (
          <span
            key={i}
            ref={(el) => (wordRefs.current[wIdx] = el)}
            style={{
              display: "inline-block",
              overflow: "hidden",
              verticalAlign: "bottom",
              lineHeight: "inherit",
              paddingBottom: "0.15em",
              marginBottom: "-0.15em",
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: revealed ? "translateY(0)" : "translateY(110%)",
                transition: `transform ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
                transitionDelay: `${startDelay + lineIdx * stagger}ms`,
                willChange: "transform",
              }}
            >
              {w}
            </span>
          </span>
        );
      })}
    </Tag>
  );
};

export default RevealText;
