"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import WorkThumb, { type Pillar } from "@/components/wireframe/WorkThumb";
import { caseImages } from "@/data/caseImages";

export interface ProjectService {
  pillar: Pillar;
  title: string;
}

/**
 * Shape consumed by the related-cases carousel and the legacy work index.
 * Originally lived in `src/data/projects.ts`; moved here so the data file
 * could be retired in favour of Sanity-driven work docs.
 */
export interface Project {
  slug: string;
  title: string;
  client: string;
  year: number;
  pillars: Pillar[];
  /** When false, listings render the card as non-interactive. */
  clickable: boolean;
  /** Highlighted on the homepage and at the top of the work index. */
  featured?: boolean;
  /** Optional short tagline for hero / cards. */
  tagline?: string;
  /** Services delivered, grouped per pillar. */
  services?: ProjectService[];
}
import { useWorkTransition, workTransition } from "@/lib/workTransition";
import { GROW_MS } from "@/components/WorkTransitionOverlay";


interface PillarCasesCarouselProps {
  pillar?: Pillar;
  projects: Project[];
  maxCases?: number;
  perPage?: number;
  autoplayMs?: number;
  title?: ReactNode;
  ctaTo?: string;
  ctaLabel?: ReactNode;
}

const PillarCasesCarousel = ({
  pillar,
  projects,
  maxCases = 9,
  perPage = 3,
  title,
  ctaTo,
  ctaLabel,
}: PillarCasesCarouselProps) => {
  const filtered = (pillar
    ? projects.filter((proj) => proj.pillars.includes(pillar))
    : projects
  ).slice(0, maxCases);

  const router = useRouter();
  const navigate = (to: string) => router.push(to);
  const transition = useWorkTransition();
  const transitionActive = transition.phase !== "idle";

  // Preload case images so the transition handoff is instant.
  useEffect(() => {
    const seen = new Set<string>();
    filtered.forEach((proj) => {
      if (!proj.clickable) return;
      const src = caseImages[proj.slug];
      if (!src || seen.has(src)) return;
      seen.add(src);
      const img = new Image();
      img.decoding = "async";
      img.src = src;
    });
  }, [filtered]);

  if (filtered.length === 0) return null;

  const hasHeader = Boolean(title || ctaTo);

  // Tile width: roughly perPage tiles per viewport, accounting for the 5px gap.
  const tileBasis =
    perPage === 1
      ? "basis-full"
      : perPage === 2
      ? "basis-[calc((100%-1.25rem)/2)]"
      : "basis-[calc((100%-2.5rem)/3)]";

  return (
    <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
      {hasHeader && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-x-3 md:gap-x-5 items-center mb-8 md:mb-10">
          <div className="md:col-span-3">
            {title && <p className="font-title">{title}</p>}
          </div>
          <div className="md:col-span-3 flex md:justify-end">
            {ctaTo && (
              <Link
                href={ctaTo}
                className="font-body inline-flex items-center gap-2 link-cta text-[#2D2928]"
              >
                {ctaLabel}
                <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
              </Link>
            )}
          </div>
        </div>
      )}
      <div className="no-scrollbar overflow-x-auto overflow-y-hidden -mx-6 md:-mx-10 xl:-mx-24 2xl:-mx-48 min-[1800px]:-mx-72 min-[2400px]:-mx-96">
        <div className="flex gap-3 md:gap-5 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
          {filtered.map((proj) => (
            <div key={proj.slug} className={`shrink-0 ${tileBasis}`}>
              <CarouselTile
                project={proj}
                transitionActive={transitionActive}
                navigate={navigate}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

interface CarouselTileProps {
  project: Project;
  transitionActive: boolean;
  navigate: (to: string) => void;
}

const CarouselTile = ({ project: proj, transitionActive, navigate }: CarouselTileProps) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const expertise = proj.pillars.join(", ");

  const handleClick = (e: MouseEvent) => {
    if (!proj.clickable) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (transitionActive) return;
    const el = imageRef.current;
    const imageSrc = caseImages[proj.slug];
    if (!el || !imageSrc) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    workTransition.start({
      slug: proj.slug,
      imageSrc,
      sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    });
    window.setTimeout(() => {
      navigate(`/work/${proj.slug}`);
    }, GROW_MS + 40);
  };

  const inner = (

    <figure className="block group">
      <div ref={imageRef} className="relative w-full overflow-hidden aspect-video">
        <WorkThumb
          pillars={proj.pillars}
          seed={proj.slug}
          fill
          quadtoneId="brio-four"
          brioPresetId="strong"
          preserveColor
          effect={0}
          eager
          className="absolute inset-0 h-full w-full transition-transform duration-[700ms] ease-out group-hover:scale-[1.04]"
        />
      </div>

      <figcaption className="mt-4 text-[#2D2928] grid grid-cols-3 gap-x-3 md:gap-x-5">
        <p className="font-title col-span-3">{proj.client}</p>
        <p className="font-meta col-span-2">{proj.tagline ?? expertise}</p>
      </figcaption>
    </figure>
  );


  return proj.clickable ? (
    <Link href={`/work/${proj.slug}`} onClick={handleClick} className="block">{inner}</Link>
  ) : (
    <div className="block cursor-default">{inner}</div>
  );
};

export default PillarCasesCarousel;
