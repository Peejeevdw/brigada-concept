import { useEffect, useRef } from "react";

interface Props {
  src: string;
  alt?: string;
  /** Max translation in px (applied symmetrically). Default 60. */
  amount?: number;
}

const ParallaxBanner = ({ src, alt = "", amount = 80 }: Props) => {
  const sectionRef = useRef<HTMLElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let raf = 0;
    let ticking = false;

    const apply = () => {
      ticking = false;
      const sec = sectionRef.current;
      const img = imgRef.current;
      if (!sec || !img) return;
      const rect = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      // p in [-1, 1]: -1 when section is below viewport, 1 when above.
      const center = rect.top + rect.height / 2;
      const p = (vh / 2 - center) / ((vh + rect.height) / 2);
      const clamped = Math.max(-1, Math.min(1, p));
      img.style.transform = `translate3d(0, ${(-clamped * amount).toFixed(2)}px, 0) scale(1.3)`;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [amount]);

  return (
    <section
      ref={sectionRef}
      className="h-screen w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] overflow-hidden"
      style={{ zIndex: 45 }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="eager"

        decoding="async"
        className="w-full h-full object-cover"
        style={{ willChange: "transform", transform: "translate3d(0,0,0) scale(1.3)" }}
      />
      <div
        className="font-hero pointer-events-none absolute inset-0 flex flex-col justify-center px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
        style={{ color: "#f3f2ef" }}
      >
        <div
          className="grid grid-cols-6 gap-3 md:gap-5"
          style={{
            fontVariationSettings: '"wdth" 120, "wght" 400',
            fontWeight: 400,
            letterSpacing: "-0.015em",
          }}
        >
          <span className="col-span-6 md:col-start-1 md:col-span-2 text-left">Sharp</span>
          <span className="col-span-6 md:col-start-3 md:col-span-2 text-center">beats</span>
          <span className="col-span-6 md:col-start-5 md:col-span-2 text-right">loud</span>
        </div>
      </div>
    </section>
  );
};

export default ParallaxBanner;
