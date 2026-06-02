"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import WorkThumb, { type Pillar, type WorkThumbHandle } from "@/components/wireframe/WorkThumb";
import { projects } from "@/data/projects";
import { caseImages } from "@/data/caseImages";
import { cn } from "@/lib/utils";
import Appear from "@/components/Appear";
import { useWorkTransition, workTransition } from "@/lib/workTransition";
import { GROW_MS } from "@/components/WorkTransitionOverlay";

const allPillars: Pillar[] = ["Brand", "Marketing", "Product", "People"];
const SOURCE_FADE_DELAY_MS = 140;
const SOURCE_FADE_MS = 180;

const parseActive = (raw: string | null): Pillar[] => {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Pillar => allPillars.includes(s as Pillar));
};

const Work = () => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname() ?? "/work";
  const setParams = (next: Record<string, string> | URLSearchParams) => {
    const sp =
      next instanceof URLSearchParams
        ? next
        : new URLSearchParams(Object.entries(next));
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  };
  const active = parseActive(params?.get("pillars") ?? params?.get("pillar"));
  const transition = useWorkTransition();
  const [fadingSlug, setFadingSlug] = useState<string | null>(null);
  const transitionActive = transition.phase !== "idle";
  const exitingSlug = fadingSlug;
  const filterNavRef = useRef<HTMLElement>(null);

  // Slide the sticky filter bar up in sync with the navbar when the footer reveals.
  useEffect(() => {
    const apply = () => {
      const el = filterNavRef.current;
      if (!el) return;
      const footer = document.querySelector<HTMLElement>("[data-site-footer]");
      let shiftPx = 0;
      if (footer) {
        const rect = footer.getBoundingClientRect();
        shiftPx = Math.max(0, window.innerHeight - rect.top);
      }
      el.style.transform = `translateY(${(-(shiftPx + 1)).toFixed(2)}px)`;
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  // (filter alignment removed; sticky filter is centered.)

  useEffect(() => {
    if (transition.phase === "idle") {
      setFadingSlug(null);
    }
  }, [transition.phase, transition.slug]);

  useEffect(() => {
    const seen = new Set<string>();

    projects.forEach((project) => {
      if (!project.clickable) return;
      const src = caseImages[project.slug];
      if (!src || seen.has(src)) return;

      seen.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }, []);

  const filtered = projects.filter((p) =>
    active.every((a) => p.pillars.includes(a))
  );

  const setActive = (next: Pillar[]) => {
    if (next.length === 0) {
      setParams({});
    } else {
      setParams({ pillars: next.join(",") });
    }
  };

  const togglePillar = (p: Pillar) => {
    setActive(active.includes(p) ? [] : [p]);
  };

  return (
    <div className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      <section
        className={cn(
          "px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10 transition-opacity ease-out",
          exitingSlug && "opacity-0",
        )}
        style={{ transitionDuration: `${SOURCE_FADE_MS}ms` }}
      >
        <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav">Work</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h1 className="font-hero mt-3 md:mt-4">
              Meet the clients
            </h1>
          </Appear>
          <Appear from="up" delay={240}>
            <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl">
              The best thing about our line of work? It’s working with the best.
              <br />
              Here’s what got our clients moving.
            </p>
          </Appear>
        </div>
      </section>

      <div className="pt-8 md:pt-12" />

      <nav
        ref={filterNavRef}
        className={cn(
          "sticky z-30 bg-[#f3f2ef] px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 py-3 flex items-center transition-opacity ease-out",
          exitingSlug && "opacity-0",
        )}
        style={{ top: "4.5rem", transitionDuration: `${SOURCE_FADE_MS}ms` }}
      >
        <FilterBar active={active} setActive={setActive} togglePillar={togglePillar} />
      </nav>

      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-0 pb-20 md:pb-28">
        <div className="grid grid-cols-6 gap-3 md:gap-5 gap-y-12 md:gap-y-16 items-start">
          {filtered.map((p, i) => (
            <div key={p.slug} className="col-span-6 md:col-span-3">
              <WorkCard
                project={p}
                index={i}
                exitingSlug={exitingSlug}
                transitionActive={transitionActive}
              />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-neutral-500 mt-12">
            No work matches all selected pillars.
          </p>
        )}
      </div>
    </div>
  );
};

interface WorkCardProps {
  project: typeof projects[number];
  index: number;
  exitingSlug: string | null;
  transitionActive: boolean;
}

const WorkCard = ({ project: p, exitingSlug, transitionActive }: WorkCardProps) => {
  const thumbRef = useRef<WorkThumbHandle>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigate = (to: string) => router.push(to);
  const tagline = p.tagline ?? p.pillars.join(", ");
  const isActive = exitingSlug === p.slug;
  const isFading = exitingSlug !== null && !isActive;

  const handleClick = (e: MouseEvent) => {
    if (!p.clickable) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (transitionActive) return;
    const el = imageRef.current;
    const imageSrc = caseImages[p.slug];
    if (!el || !imageSrc) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    workTransition.start({
      slug: p.slug,
      imageSrc,
      sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    });
    window.setTimeout(() => {
      navigate(`/work/${p.slug}`);
    }, GROW_MS + 40);
  };

  const inner = (
    <Appear as="figure" from="up" distance={40} duration={900} threshold={0.12} className="block group">
      <div
        ref={imageRef}
        className="relative w-full overflow-hidden aspect-[16/9]"
      >
        <WorkThumb
          ref={thumbRef}
          pillars={p.pillars}
          seed={p.slug}
          fill
          imperative
          eager
          quadtoneId="brio-four"
          brioPresetId="strong"
          preserveColor
          className="absolute inset-0 h-full w-full transition-transform duration-[700ms] ease-out group-hover:scale-[1.04]"
        />
      </div>
      <figcaption
        className={cn(
          "mt-4 text-[#2D2928] transition-opacity ease-out grid grid-cols-3 gap-x-3 md:gap-x-5",
          (isFading || isActive) && "opacity-0",
        )}
        style={{ transitionDuration: `${SOURCE_FADE_MS}ms` }}
      >
        <p className="font-title col-span-3">{p.client}</p>
        <p className="font-meta col-span-2">{tagline}</p>
      </figcaption>
    </Appear>
  );

  const wrapperFade = cn(
    "transition-opacity ease-out",
    isFading && "opacity-0",
  );

  return p.clickable ? (
    <Link
      href={`/work/${p.slug}`}
      onClick={handleClick}
      className={cn("block", wrapperFade)}
      style={{ transitionDuration: `${SOURCE_FADE_MS}ms` }}
    >
      {inner}
    </Link>
  ) : (
    <div className={cn("block cursor-default", wrapperFade)}>{inner}</div>
  );
};

interface FilterBarProps {
  active: Pillar[];
  setActive: (next: Pillar[]) => void;
  togglePillar: (p: Pillar) => void;
}

const FILTER_OPTIONS = ["All", "Brand", "Product", "People", "Marketing"] as const;
type FilterLabel = (typeof FILTER_OPTIONS)[number];

// Column placement (1-indexed) when the bar is hovered.
const FILTER_COL: Record<FilterLabel, number> = {
  All: 2,
  Brand: 3,
  Product: 4,
  People: 5,
  Marketing: 6,
};

const FilterBar = ({ active, setActive, togglePillar }: FilterBarProps) => {
  const currentLabel: FilterLabel = active.length === 0 ? "All" : (active[0] as FilterLabel);

  const select = (label: FilterLabel) => {
    if (label === "All") setActive([]);
    else togglePillar(label as Pillar);
  };

  return (
    <div className="grid grid-cols-6 gap-3 md:gap-5 w-full">
      <div className="row-start-1 col-start-1">
        <span className="font-nav text-[#2D2928] opacity-50 whitespace-nowrap">
          Filter
        </span>
      </div>
      {FILTER_OPTIONS.map((label) => {
        const isCurrent = label === currentLabel;
        const colClass =
          label === "All" ? "col-start-2"
          : label === "Brand" ? "col-start-3"
          : label === "Product" ? "col-start-4"
          : label === "People" ? "col-start-5"
          : "col-start-6";
        return (
          <div key={label} className={cn("row-start-1", colClass)}>
            <button
              type="button"
              onClick={() => select(label)}
              className={cn(
                "link-cta font-nav text-[#2D2928] whitespace-nowrap",
                isCurrent && "underline underline-offset-4"
              )}
            >
              {label}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Work;