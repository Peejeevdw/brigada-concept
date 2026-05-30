import React, { ElementType, useEffect, useLayoutEffect, useRef, useState } from "react";

interface ScrollAlignHeadingProps {
  as?: ElementType;
  text: string;
  className?: string;
  /** Max width used for line wrapping. Container itself stays full width. */
  lineMaxWidth?: string;
  /** Words/phrases to render in serif when their line is right-aligned. */
  serifOnRight?: string[];
}

/**
 * Splits the text into visual lines based on actual rendered layout, then
 * snaps each line's alignment in a cascade as the heading scrolls through
 * the viewport:
 *   - line 1 moves to center
 *   - then line 1 moves to right, line 2 moves to center
 *   - then line 2 moves to right, line 3 moves to center, ...
 * Lines remain full width; only the text content snaps left, center, right.
 */
const ScrollAlignHeading = ({
  as: Tag = "h2",
  text,
  className,
  lineMaxWidth = "50%",
  serifOnRight = [],
}: ScrollAlignHeadingProps) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [lines, setLines] = useState<string[]>([text]);
  const [aligns, setAligns] = useState<number[]>([]);

  // Measure: split words into lines based on actual wrap positions.
  useLayoutEffect(() => {
    const measure = () => {
      const node = measureRef.current;
      if (!node) return;
      const wordSpans = Array.from(
        node.querySelectorAll<HTMLSpanElement>("[data-w]")
      );
      if (wordSpans.length === 0) {
        setLines([text]);
        return;
      }
      const grouped: string[][] = [];
      let currentTop: number | null = null;
      wordSpans.forEach((span) => {
        const top = span.offsetTop;
        if (currentTop === null || top !== currentTop) {
          grouped.push([span.textContent ?? ""]);
          currentTop = top;
        } else {
          grouped[grouped.length - 1].push(span.textContent ?? "");
        }
      });
      setLines(grouped.map((g) => g.join(" ")));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (measureRef.current) ro.observe(measureRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  // Each line snaps to its next alignment as soon as its own vertical
  // center crosses the 50% line of the viewport. A line is "left" before
  // it crosses, "center" once it crosses, and "right" once the line below
  // it has also crossed. The last line never advances to right.
  useEffect(() => {
    let raf = 0;

    const update = () => {
      const node = containerRef.current;
      if (!node) return;
      const vh = window.innerHeight;
      const containerRect = node.getBoundingClientRect();
      // Skip work when the heading is fully off-screen.
      if (containerRect.bottom < -100 || containerRect.top > vh + 100) return;
      const lineEls = Array.from(
        node.querySelectorAll<HTMLDivElement>("[data-line]")
      );
      const half = vh / 2;

      const data = lineEls.map((el) => {
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        return {
          crossed: center <= half,
          // "past" means the line has moved a full line-height above center,
          // used to advance the very last line from center to right.
          past: center <= half - rect.height,
        };
      });

      const next = data.map((d, i) => {
        if (!d.crossed) return 0; // left
        const isLast = i === data.length - 1;
        if (isLast) return d.past ? 1 : 0.5;
        return data[i + 1].crossed ? 1 : 0.5;
      });

      setAligns((prev) => {
        if (
          prev.length === next.length &&
          prev.every((v, i) => v === next[i])
        ) {
          return prev;
        }
        return next;
      });
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [lines.length]);

  const alignFor = (i: number) => aligns[i] ?? 0;

  return (
    <Tag ref={containerRef as never} className={className}>
      {/* Hidden measurement copy: same typography, full width, used to detect line wrapping. */}
      <span
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          left: 0,
          top: 0,
          width: lineMaxWidth,
          maxWidth: "100%",
          whiteSpace: "normal",
        }}
      >
        {text.split(/\s+/).map((w, i) => (
          <span key={i} data-w>
            {w}{" "}
          </span>
        ))}
      </span>

      {lines.map((line, i) => {
        const a = alignFor(i); // 0 | 0.5 | 1
        const isRight = a === 1;
        // Build content: when right-aligned, wrap matching phrases in a serif span.
        let content: React.ReactNode = line;
        if (isRight && serifOnRight.length > 0) {
          // Expand multi-word phrases into individual words too, so highlighting
          // still works when a phrase wraps across lines.
          const tokens = Array.from(
            new Set(
              serifOnRight.flatMap((s) => [s, ...s.split(/\s+/)])
            )
          ).sort((a, b) => b.length - a.length);
          const escaped = tokens
            .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
            .join("|");
          const re = new RegExp(`(${escaped})`, "gi");
          const parts = line.split(re);
          const lc = tokens.map((s) => s.toLowerCase());
          content = parts.map((p, idx) =>
            lc.includes(p.toLowerCase()) ? (
              <span
                key={idx}
                style={{ fontFamily: "'Antarctica', system-ui, sans-serif", fontWeight: 400, fontStyle: "italic" }}
              >
                {p}
              </span>
            ) : (
              <span key={idx}>{p}</span>
            )
          );
        }
        return (
          <div
            key={i}
            data-line
            style={{
              display: "block",
              width: "100%",
              position: "relative",
              whiteSpace: "nowrap",
              overflow: "visible",
            }}
          >
            <span
              style={{
                display: "inline-block",
                position: "relative",
                left: `${a * 100}%`,
                transform: `translateX(${-a * 100}%)`,
                transition: "none",
                willChange: "left, transform",
              }}
            >
              {content}
            </span>
          </div>
        );
      })}
    </Tag>
  );
};

export default ScrollAlignHeading;
