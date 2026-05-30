import { ElementType, useLayoutEffect, useRef, useState } from "react";

interface StaticAlignHeadingProps {
  as?: ElementType;
  text: string;
  className?: string;
  /** Max width used for line wrapping. Container itself stays full width. */
  lineMaxWidth?: string;
}

/**
 * Splits the text into visual lines based on actual rendered layout, then
 * statically aligns: line 1 right, line 2 center, all subsequent lines left.
 */
const StaticAlignHeading = ({
  as: Tag = "h2",
  text,
  className,
  lineMaxWidth = "66.6667%",
}: StaticAlignHeadingProps) => {
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const [lines, setLines] = useState<string[]>([text]);

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

  const alignFor = (i: number) => {
    if (i === 0) return "right" as const;
    if (i === 1) return "center" as const;
    return "left" as const;
  };

  return (
    <Tag className={className} style={{ position: "relative" }}>
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

      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: "block",
            width: "100%",
            textAlign: alignFor(i),
            whiteSpace: "nowrap",
            overflow: "visible",
          }}
        >
          {line}
        </div>
      ))}
    </Tag>
  );
};

export default StaticAlignHeading;
