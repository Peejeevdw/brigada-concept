import { useEffect, useRef, useState, ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  thickness?: number;
  duration?: number;
};

const ScrollUnderline = ({ children, className, thickness = 2, duration = 700 }: Props) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top <= vh / 2) setActive(true);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <span
      ref={ref}
      className={className}
      style={{
        position: "relative",
        backgroundImage: "linear-gradient(currentColor, currentColor)",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 100%",
        backgroundSize: `${active ? 100 : 0}% ${thickness}px`,
        transition: `background-size ${duration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        paddingBottom: 1,
      }}
    >
      {children}
    </span>
  );
};

export default ScrollUnderline;
