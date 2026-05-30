import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type ElementType } from "react";
import { cn } from "@/lib/utils";

type Direction = "up" | "down" | "left" | "right" | "none";

interface AppearProps {
  children: ReactNode;
  /** Render element, defaults to div */
  as?: ElementType;
  /** Slide direction */
  from?: Direction;
  /** Travel distance in px */
  distance?: number;
  /** Delay before animation, ms */
  delay?: number;
  /** Animation duration, ms */
  duration?: number;
  /** Trigger only once */
  once?: boolean;
  /** Threshold of visibility before triggering (0..1) */
  threshold?: number;
  /** rootMargin override for IntersectionObserver */
  rootMargin?: string;
  className?: string;
  style?: CSSProperties;
}

const buildTransform = (from: Direction, distance: number) => {
  switch (from) {
    case "up":
      return `translate3d(0, ${distance}px, 0)`;
    case "down":
      return `translate3d(0, -${distance}px, 0)`;
    case "left":
      return `translate3d(${distance}px, 0, 0)`;
    case "right":
      return `translate3d(-${distance}px, 0, 0)`;
    default:
      return "translate3d(0, 0, 0)";
  }
};

/**
 * Scroll-triggered "appear" wrapper.
 * Fades + slides children in once they enter the viewport.
 */
const Appear = ({
  children,
  as: Tag = "div",
  from = "up",
  distance = 24,
  delay = 0,
  duration = 700,
  once = true,
  threshold = 0.15,
  rootMargin = "0px 0px -8% 0px",
  className,
  style,
}: AppearProps) => {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion users.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold, rootMargin]);

  const composedStyle: CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translate3d(0, 0, 0)" : buildTransform(from, distance),
    transition: `opacity ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}ms`,
    willChange: "opacity, transform",
    ...style,
  };

  return (
    <Tag ref={ref as never} className={cn(className)} style={composedStyle}>
      {children}
    </Tag>
  );
};

export default Appear;
