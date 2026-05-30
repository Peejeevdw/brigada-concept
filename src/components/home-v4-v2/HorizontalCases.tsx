import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { caseImages } from "@/data/caseImages";
import type { Project } from "@/data/projects";

import FootageColorsSequence from "@/components/FootageColorsSequence";
import { workTransition } from "@/lib/workTransition";
import { GROW_MS } from "@/components/WorkTransitionOverlay";

interface Props {
  projects: Project[];
  count?: number;
}

const HorizontalCases = ({ projects, count = 4 }: Props) => {
  const items = projects.slice(0, count);
  const sectionRef = useRef<HTMLElement>(null);
  const tileLayerRefs = useRef<Array<HTMLDivElement | null>>([]);
  const tileRefs = useRef<Array<HTMLDivElement | null>>([]);
  const progressRef = useRef(0); // shared with FootageColorsSequence
  const navigate = useNavigate();

  // Source list for the shared WebGL background (skip cases without an image).
  const sequenceSources = useMemo(
    () => items.map((p) => caseImages[p.slug]).filter(Boolean) as string[],
    [items],
  );

  const handleTileClick = (e: MouseEvent, slug: string, idx: number) => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = tileRefs.current[idx];
    const imageSrc = caseImages[slug];
    if (!el || !imageSrc) return;
    e.preventDefault();
    requestAnimationFrame(() => {
      const node = tileRefs.current[idx];
      if (!node) return;
      const rect = node.getBoundingClientRect();
      workTransition.start({
        slug,
        imageSrc,
        sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      });
      window.setTimeout(() => {
        navigate(`/work/${slug}`);
      }, GROW_MS + 40);
    });
  };

  // Scroll driver: feeds the tile clip-path wipe AND the shared background's progress.
  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const N = items.length;
    const lastTileLeft: number[] = new Array(N).fill(-1);

    const apply = () => {
      ticking = false;
      const sec = sectionRef.current;
      if (!sec) return;
      const rect = sec.getBoundingClientRect();
      const distance = sec.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), distance);
      const p = distance > 0 ? scrolled / distance : 0;
      const t = p * (N - 1);
      progressRef.current = t;

      for (let i = 0; i < N; i++) {
        const el = tileLayerRefs.current[i];
        if (!el) continue;
        const revealIn = i === 0 ? 1 : Math.min(Math.max(t - (i - 1), 0), 1);
        const revealOut = i >= N - 1 ? 0 : Math.min(Math.max(t - i, 0), 1);
        const insetLeft = (1 - revealIn) * 100;
        const insetRight = revealOut * 100;
        const qL = Math.round(insetLeft * 10) / 10;
        const qR = Math.round(insetRight * 10) / 10;
        const key = qL * 10000 + qR;
        if (key === lastTileLeft[i]) continue;
        lastTileLeft[i] = key;
        el.style.clipPath = `inset(0 ${qR}% 0 ${qL}%)`;
      }
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
  }, [items.length]);

  return (
    <section
      ref={sectionRef}
      data-selected-work
      className="relative w-full bg-[#f3f2ef]"
      style={{ height: `${items.length * 100}vh`, zIndex: 60 }}
    >
      <div
        className="sticky top-0 h-screen w-screen overflow-hidden bg-[#2D2928]"
        style={{
          transform: "translateZ(0)",
          contain: "layout paint",
          willChange: "transform",
        }}
      >
        {/* Single shared WebGL footage-colors background. */}
        {sequenceSources.length > 0 && (
          <FootageColorsSequence
            sources={sequenceSources}
            progressRef={progressRef}
            className="z-0"
          />
        )}

        {items.map((p, i) => {
          const img = caseImages[p.slug];
          const tagline = p.tagline ?? p.pillars.join(", ");
          const clickable = !!p.clickable;
          const InnerTag: any = clickable ? Link : "div";
          const innerProps = clickable
            ? {
                to: `/work/${p.slug}`,
                onClick: (e: MouseEvent) => handleTileClick(e, p.slug, i),
              }
            : {};
          return (
            <div
              key={p.slug}
              ref={(el) => {
                tileLayerRefs.current[i] = el;
              }}
              className="absolute inset-0 h-full w-full overflow-hidden pointer-events-none"
              style={{
                zIndex: 10 + i,
                clipPath: i === 0 ? "inset(0 0 0 0)" : "inset(0 0 0 100%)",
                willChange: "clip-path",
              }}
            >
              <div
                className="absolute top-32 bottom-32 left-0 right-0 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pointer-events-none"
                style={{ containerType: "size" }}
              >
                <InnerTag
                  {...innerProps}
                  className={`group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block ${clickable ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                  style={{
                    width: "min(100cqw, calc(100cqh * 16 / 9))",
                    aspectRatio: "16 / 9",
                  }}
                >
                  <div
                    ref={(el) => {
                      tileRefs.current[i] = el;
                    }}
                    className="relative h-full w-full overflow-hidden"
                  >
                    {img && (
                      <img
                        src={img}
                        alt={p.title}
                        loading="lazy"
                        decoding="async"
                        className={`block h-full w-full object-cover transition-transform duration-700 ${clickable ? "group-hover:scale-110" : ""}`}
                      />
                    )}
                  </div>
                  <div className="absolute left-0 right-0 top-full mt-4 text-[#f3f2ef] grid grid-cols-3 gap-x-3 md:gap-x-5">
                    <p className="font-title col-span-3">{p.client}</p>
                    <p className="font-meta col-span-2">{tagline}</p>
                  </div>
                </InnerTag>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HorizontalCases;
