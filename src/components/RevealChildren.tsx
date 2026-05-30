import {
  Children,
  ElementType,
  ReactNode,
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

interface RevealChildrenProps {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Delay (ms) added between each line. */
  stagger?: number;
  /** Per-line transition duration (ms). */
  duration?: number;
  /** Trigger threshold (0-1) for IntersectionObserver. */
  threshold?: number;
}

/**
 * Line-by-line reveal that preserves inline elements (links, spans, etc.).
 * Words are individually masked, but grouped by their rendered offsetTop
 * so each visual line slides up together.
 */
const RevealChildren = ({
  as: Tag = "p",
  children,
  className,
  stagger = 90,
  duration = 700,
  threshold = 0.2,
}: RevealChildrenProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [lineMap, setLineMap] = useState<number[]>([]);

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
  });

  let wordIndex = 0;

  const wrapWord = (content: ReactNode, key: string) => {
    const idx = wordIndex++;
    const lineIdx = lineMap[idx] ?? 0;
    return (
      <span
        key={key}
        ref={(el) => (wordRefs.current[idx] = el)}
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
            transitionDelay: `${lineIdx * stagger}ms`,
            willChange: "transform",
          }}
        >
          {content}
        </span>
      </span>
    );
  };

  const renderNode = (node: ReactNode, keyPrefix: string): ReactNode => {
    if (node === null || node === undefined || node === false) return null;

    if (typeof node === "string" || typeof node === "number") {
      const parts = String(node).split(/(\s+)/);
      return parts.map((p, i) => {
        if (p === "") return null;
        if (/^\s+$/.test(p)) return <span key={`${keyPrefix}-s-${i}`}>{p}</span>;
        return wrapWord(p, `${keyPrefix}-w-${i}`);
      });
    }

    if (Array.isArray(node)) {
      return node.map((child, i) => renderNode(child, `${keyPrefix}-${i}`));
    }

    if (isValidElement(node)) {
      const childChildren = (node.props as { children?: ReactNode }).children;
      const newChildren = Children.count(childChildren)
        ? renderNode(childChildren, `${keyPrefix}-c`)
        : childChildren;
      return cloneElement(node, { key: keyPrefix }, newChildren);
    }

    return node;
  };

  const rendered = renderNode(children, "rc");

  return (
    <Tag ref={ref as never} className={className}>
      {rendered}
    </Tag>
  );
};

export default RevealChildren;
