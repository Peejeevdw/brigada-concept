import { useEffect, useState } from "react";
import {
  EXPERTISE_SLIDE_MS,
  useExpertiseTransition,
} from "@/lib/expertiseTransition";
import { pillarContent } from "@/data/pillars";

const ExpertiseTransitionOverlay = () => {
  const t = useExpertiseTransition();
  const [slidIn, setSlidIn] = useState(false);

  useEffect(() => {
    if (t.phase === "sliding") {
      // Start at translateY(-100%), then on next frame animate to 0.
      setSlidIn(false);
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => setSlidIn(true));
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    }
    if (t.phase === "idle") {
      setSlidIn(false);
    }
    if (t.phase === "fading" || t.phase === "settling") {
      setSlidIn(true);
    }
  }, [t.phase]);

  // Lock page scroll while the transition is running.
  useEffect(() => {
    if (t.phase === "idle") return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("wheel", prevent);
      window.removeEventListener("touchmove", prevent);
    };
  }, [t.phase]);

  if (t.phase === "idle" || !t.pillar) return null;

  const pillar = t.pillar;
  const intro = t.intro ?? pillarContent[pillar].servicesIntro;

  const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 45,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          transform: slidIn ? "translateY(0)" : "translateY(-100%)",
          transition: `transform ${EXPERTISE_SLIDE_MS}ms ${ease}`,
          willChange: "transform",
          backgroundColor: "#f3f2ef",
        }}
      >
        {/* HERO, mirrors ExpertiseDetail */}
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10">
          <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
            <p className="font-nav" style={{ color: "#2D2928" }}>
              Expertise
            </p>
            <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>
              {pillar} services
            </h2>
            <p
              className="font-meta mt-4 md:mt-5 mx-auto max-w-xl"
              style={{ color: "#2D2928" }}
            >
              {intro}
            </p>
          </div>
        </section>
        <div className="pt-8 md:pt-12" />
        {/* DIVIDER */}
        <div className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
          <hr className="font-body border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />
        </div>
      </div>
    </div>
  );
};

export default ExpertiseTransitionOverlay;
