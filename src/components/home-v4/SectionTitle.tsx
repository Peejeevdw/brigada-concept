import { useEffect, useRef, useState } from "react";

type Props = {
  text?: string;
};

const SectionTitle = ({ text = "Selected Work" }: Props) => {
  const sectionRef = useRef<HTMLElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const compute = () => {
      const section = sectionRef.current;
      const inner = innerRef.current;
      if (!section || !inner) return;

      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const overflow = Math.max(0, inner.scrollWidth - section.clientWidth);

      if (prefersReduced || overflow === 0) {
        setOffset(overflow);
        return;
      }

      // Start moving once the title is fully in view (bottom edge reaches the
      // bottom of the viewport), finish before the top edge scrolls off-screen.
      const start = vh - rect.height; // rect.top value where progress = 0
      const end = 0; // rect.top value where progress = 1
      const raw = (start - rect.top) / (start - end);
      const p = Math.max(0, Math.min(1, raw));
      setOffset(p * overflow);
    };

    compute();
    let raf = 0;
    const onScroll = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <section
      ref={sectionRef}
      className="px-6 md:px-10 pt-2 md:pt-4 pb-12 md:pb-20 bg-[#f3f2ef] overflow-hidden"
    >
      <div
        ref={innerRef}
        className="font-serif font-medium leading-[0.85] text-[#2D2928] whitespace-nowrap will-change-transform"
        style={{
          fontSize: "clamp(3rem, 17vw, 20rem)",
          transform: `translate3d(${-offset}px, 0, 0)`,
        }}
      >
        {text}
      </div>
    </section>
  );
};

export default SectionTitle;
