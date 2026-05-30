import { ElementType, CSSProperties } from "react";

interface HoverWeightHeadingProps {
  as?: ElementType;
  text: string;
  className?: string;
  baseWeight?: number;
  hoverWeight?: number;
}

/**
 * Splits text into words. Each word animates its font weight from baseWeight
 * to hoverWeight on hover, and back when the cursor leaves.
 *
 * To prevent reflow (words jumping between lines as weight changes), each
 * word reserves space at the heaviest weight via an invisible ::before
 * pseudo-element using the data-text attribute. The visible text is
 * absolutely-positioned on top.
 */
const HoverWeightHeading = ({
  as: Tag = "h2",
  text,
  className,
  baseWeight = 600,
  hoverWeight = 100,
}: HoverWeightHeadingProps) => {
  const words = text.split(/(\s+)/); // keep whitespace tokens
  const reserveWeight = Math.max(baseWeight, hoverWeight, 900);

  const wordStyle: CSSProperties = {
    fontFamily: "'Antarctica', system-ui, sans-serif",
    // CSS custom props consumed by the pseudo-element + visible span
    ["--w-base" as string]: String(baseWeight),
    ["--w-reserve" as string]: String(reserveWeight),
  };

  return (
    <>
      <style>{`
        .hwh-word {
          position: relative;
          display: inline-block;
          font-variation-settings: "wght" var(--w-reserve);
          font-weight: var(--w-reserve);
          color: transparent;
        }
        .hwh-word::before {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          color: hsl(var(--foreground));
          font-variation-settings: "wght" var(--w-base);
          font-weight: var(--w-base);
          letter-spacing: var(--ls, 0em);
          transition: font-variation-settings 400ms ease, font-weight 400ms ease, letter-spacing 400ms ease;
          will-change: font-variation-settings, letter-spacing;
        }
      `}</style>
      <Tag className={className}>
        {words.map((w, i) => {
          if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
          // Letter-spacing compensation: thinner glyphs are narrower, so
          // distribute the freed space evenly across the gaps to keep the
          // visible word stretched to the reserved width.
          const gaps = Math.max(w.length - 1, 1);
          // Empirically ~0.18em of total width is freed going from 900 to 100.
          const totalExtra = 0.18 * Math.abs(reserveWeight - hoverWeight) / 800;
          const hoverLs = `${(totalExtra / gaps).toFixed(4)}em`;
          return (
            <span
              key={i}
              className="hwh-word"
              data-text={w}
              style={wordStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.setProperty("--w-base", String(hoverWeight));
                e.currentTarget.style.setProperty("--ls", hoverLs);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.setProperty("--w-base", String(baseWeight));
                e.currentTarget.style.setProperty("--ls", "0em");
              }}
            >
              {w}
            </span>
          );
        })}
      </Tag>
    </>
  );
};

export default HoverWeightHeading;
