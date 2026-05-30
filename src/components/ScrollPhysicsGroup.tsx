import { Children, isValidElement, useMemo, type ReactNode } from "react";
import {
  motion,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

interface ScrollPhysicsGroupProps {
  children: ReactNode;
  /** Max drift in px applied at high scroll velocity. */
  maxOffset?: number;
  /** Velocity (px/s) at which drift reaches maxOffset. */
  velocityRange?: number;
  /** Spring tuning for the settle. */
  stiffness?: number;
  damping?: number;
  mass?: number;
}

/**
 * Wraps direct children with subtle scroll-velocity-driven vertical drift,
 * powered by Framer Motion's useVelocity + useSpring (real spring physics).
 * Adjacent children drift in opposite directions, so the gap between them
 * briefly grows while scrolling and settles back naturally.
 */
const ScrollPhysicsGroup = ({
  children,
  maxOffset = 32,
  velocityRange = 1500,
  stiffness = 70,
  damping = 22,
  mass = 0.6,
}: ScrollPhysicsGroupProps) => {
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smoothed = useSpring(velocity, { stiffness, damping, mass });

  const array = Children.toArray(children).filter(isValidElement);
  const cycle = [0.35, 1.0, 0.6, 1.25, 0.8];

  return (
    <>
      {array.map((child, i) => (
        <DriftItem
          key={child.key ?? i}
          smoothed={smoothed}
          amount={maxOffset * cycle[i % cycle.length]}
          velocityRange={velocityRange}
          zIndex={i + 1}
        >
          {child}
        </DriftItem>
      ))}
    </>
  );
};

interface DriftItemProps {
  children: ReactNode;
  smoothed: MotionValue<number>;
  amount: number;
  velocityRange: number;
  zIndex: number;
}

const DriftItem = ({ children, smoothed, amount, velocityRange, zIndex }: DriftItemProps) => {
  // All items drift in the same direction (down while scrolling down),
  // creating a "lag behind the scroll" feel. Upward scroll = no drift.
  const y = useTransform(
    smoothed,
    [0, velocityRange],
    [0, amount],
    { clamp: true },
  );
  const style = useMemo(() => ({ y, position: "relative" as const, zIndex }), [y, zIndex]);
  return <motion.div style={style}>{children}</motion.div>;
};

export default ScrollPhysicsGroup;
