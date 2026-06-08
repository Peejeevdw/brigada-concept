"use client";

import type { CSSProperties, MouseEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { caseImages } from "@/data/caseImages";
import { BlockRenderer } from "@/components/case-blocks/BlockRenderer";
import type { CaseBlock } from "@/components/case-blocks/types";
import WorkThumb, { type Pillar, type WorkThumbHandle } from "@/components/wireframe/WorkThumb";
import Appear from "@/components/Appear";
import { cn } from "@/lib/utils";
import BrioImageComposite from "@/components/BrioImageComposite";
import PillarCasesCarousel, { type Project } from "@/components/PillarCasesCarousel";
import ScrollPhysicsGroup from "@/components/ScrollPhysicsGroup";
import { DEFAULT_BRIO_SETTINGS, quadtones } from "@/data/duotones";
import { useWorkTransition, workTransition } from "@/lib/workTransition";
import { GROW_MS as OVERLAY_GROW_MS } from "@/components/WorkTransitionOverlay";
const extra1 = "/assets/case/feed-9.jpg";
const extra2 = "/assets/case/feed-8-1.jpg";
const extra3 = "/assets/case/feed-6-7.jpg";
const extra4 = "/assets/case/feed-1.jpg";
const extra5 = "/assets/case/feed-8.jpg";
const agristoJobs = "/assets/case/agristo-jobs.webp";
const agristoRecipe = "/assets/case/agristo-recipe.png";
const agristoPhone = "/assets/case/agristo-phone.png";
const agristoHero = "/assets/case/agristo-hero.png";
const bmwOldTile = "/assets/cases/bmw.jpg";

const GROW_MS = 600;
const REVEAL_SCROLL_MS = 700;
const SOURCE_FADE_DELAY_MS = 140;
const SOURCE_FADE_MS = 180;

const defaultExtras = [extra1, extra2, extra3, extra4, extra5];

interface CaseContent {
  brief: [string, string];
  approach: [string, string];
  context: string;
  outcome: [string, string];
  images: [string, string, string, string, string];
}

const caseContent: Record<string, CaseContent> = {
  agristo: {
    brief: [
      "Agristo is a family-run Belgian potato company that supplies frozen products to retail and foodservice clients across the world. They asked us to translate their down-to-earth, hands-on culture into a brand world that could compete with much larger global players.",
      "The work spans a refreshed identity, a new digital platform, an employer branding campaign and a recipe & potato concepts experience that brings the product to life for chefs and consumers alike.",
    ],
    approach: [
      "We leaned into what makes Agristo different: a tight-knit team, a love for the craft, and a sense of humour that is rare in B2B food. The verbal identity is warm and a little cheeky; the visual system is bright, generous and unmistakably yellow.",
      "On the product side we built a flexible CMS-driven platform so the marketing and HR teams can publish recipes, potato concepts and jobs at speed, without ever feeling like a corporate site.",
    ],
    context:
      "Frozen potatoes are a commodity category dominated by industrial players talking about scale and efficiency. Agristo wanted to compete on personality and craft instead. We worked with their team in Harelbeke for nearly a year, sitting in on production tours, tasting sessions and recruitment days, so the brand we shipped felt like the company we met.",
    outcome: [
      "The new Agristo brand is showing up everywhere: from the recipe site that now drives qualified leads from chefs, to the Vetste Jobs employer campaign that hit record application numbers in its first quarter.",
      "Internally, the team finally has a brand they recognise as their own: confident, playful, and proud of the potato.",
    ],
    images: [agristoJobs, agristoRecipe, agristoPhone, agristoHero, agristoJobs],
  },
};

const defaultContent: CaseContent = {
  brief: [
    "BMW asked us to reframe what the ultimate driving machine stands for in an era where the category is being redefined by electrification, software and shifting cultural codes.",
    "We rebuilt the brand expression from the inside out: a sharper positioning, a fresh visual and verbal identity, a naming framework for the model portfolio, and a digital platform that puts the new BMW into drivers' hands every day.",
  ],
  approach: [
    "We treated the rebrand as a system, not a skin. Strategy, identity, naming and product worked in lockstep, so every decision reinforced the next instead of pulling in different directions.",
    "The result is a brand that scales: a flexible visual language, a clear verbal toolkit, and a product architecture that lets teams ship new offers without reinventing the wheel each time.",
  ],
  context:
    "The premium automotive category had drifted into a sea of sameness: identical silhouettes, identical promises, identical tones. Drivers stopped listening, and brands stopped standing for anything beyond their badge. Our work started with a simple question: what does BMW actually believe in today? From there we mapped audiences, decoded category codes, and rebuilt the foundations the rest of the program would stand on.",
  outcome: [
    "The new BMW shows up sharper across every touchpoint: a positioning the organisation can rally behind, an identity that cuts through a flat category, and a model portfolio that finally speaks one language.",
    "Internally, teams move faster because the brand decisions have already been made; externally, drivers recognise BMW before they read the logo.",
  ],
  images: [extra1, extra2, extra3, extra4, bmwOldTile],
};

export interface WorkDocData {
  _id?: string;
  name?: string | null;
  client?: string | null;
  slug?: string | null;
  intro?: string | null;
  year?: number | null;
  code?: string | null;
  serviceCategories?: Array<{ _id?: string; name?: string | null; slug?: string | null }> | null;
  body?: CaseBlock[] | null;
  gallery?: unknown[] | null;
  related?: Array<RelatedWork> | null;
}

interface RelatedWork {
  _id?: string;
  slug?: string | null;
  name?: string | null;
  client?: string | null;
  intro?: string | null;
  year?: number | null;
  featured?: boolean | null;
  serviceCategories?: Array<{ _id?: string; name?: string | null; slug?: string | null }> | null;
}

const WorkDetail = ({ work }: { work?: WorkDocData | null } = {}) => {
  // Derive a project-shaped object (matches the old projects.ts shape) from
  // the Sanity work doc so the page's transition + thumb logic keeps working.
  const slug = work?.slug ?? "";
  const project = {
    slug,
    client: work?.client || work?.name || "",
    title: work?.name || "",
    tagline: work?.intro ?? undefined,
    year: work?.year ?? null,
    pillars: (work?.serviceCategories ?? []).map((e) => e?.name).filter(Boolean) as string[],
  };
  const body: CaseBlock[] = (work?.body ?? []) as CaseBlock[];

  const transition = useWorkTransition();
  const isTransitioning =
    transition.slug === project.slug && transition.phase !== "idle" && transition.phase !== "done";
  const cleanImgRef = useRef<HTMLImageElement>(null);

  // Align BRGD.001 right edge with the right edge of the last navbar item (Contact).
  // We compute the difference between the page's right padding and the nav-item
  // right edge, so BRGD lands exactly on the 1st blue line from the right.
  const heroWrapRef = useRef<HTMLDivElement>(null);
  const [brgdMarginRight, setBrgdMarginRight] = useState(0);
  const [clientPaddingLeft, setClientPaddingLeft] = useState(0);
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector("header nav");
      if (!nav) return;
      const items = nav.children;
      const last = items[items.length - 1] as HTMLElement | undefined;
      const wrap = heroWrapRef.current;
      if (!last || !wrap) return;
      const navLeft = last.getBoundingClientRect().left;
      const wrapRect = wrap.getBoundingClientRect();
      setBrgdMarginRight(wrapRect.right - navLeft);
      const brigada = items[0] as HTMLElement | undefined;
      if (brigada) {
        const brigadaRight = brigada.getBoundingClientRect().right;
        setClientPaddingLeft(Math.max(0, brigadaRight - wrapRect.left));
      }
    };
    measure();
    window.addEventListener("resize", measure);
    const id = window.setInterval(measure, 500);
    return () => {
      window.removeEventListener("resize", measure);
      window.clearInterval(id);
    };
  }, []);

  // On mount during a transition: position scroll so the hero clean image lands at viewport center,
  // then hand the viewport-centered target rect back to the overlay.
  useLayoutEffect(() => {
    if (transition.slug !== project.slug) return;
    if (transition.phase !== "moving" && transition.phase !== "holding") return;
    // Stay at top so the hero rect lands at its natural position under the navbar.
    window.scrollTo({ top: 0, behavior: "auto" });

    let lastKey = "";
    const measure = () => {
      const el = cleanImgRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const key = `${Math.round(r.left)}:${Math.round(r.top)}:${Math.round(r.width)}:${Math.round(r.height)}`;
      if (key !== lastKey) {
        lastKey = key;
        workTransition.setTargetRect({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
        });
      }
    };

    // Measure across two frames so any same-tick reflow from SiteLayout/Nav
    // settles before the overlay starts shrinking toward the rect.
    let id2: number | null = null;
    const id1 = requestAnimationFrame(() => {
      measure();
      id2 = requestAnimationFrame(() => {
        measure();
        if (workTransition.get().phase === "holding") {
          workTransition.setPhase("moving");
        }
      });
    });

    // Keep the target rect in sync if the hero resizes after we've handed it off.
    const ro = new ResizeObserver(() => measure());
    if (cleanImgRef.current) ro.observe(cleanImgRef.current);

    return () => {
      if (id2 !== null) cancelAnimationFrame(id2);
      cancelAnimationFrame(id1);
      ro.disconnect();
    };
  }, [transition.phase, transition.slug, project.slug]);

  // After the overlay grow completes, hand off to the detail hero immediately.
  useEffect(() => {
    if (transition.slug !== project.slug) return;
    if (transition.phase !== "growing") return;
    workTransition.setPhase("done");
  }, [transition.phase, transition.slug, project.slug]);

  const phase = transition.slug === project.slug ? transition.phase : "idle";
  const heroBrioScale = phase === "moving" || phase === "holding" ? 0 : 1;
  // Only show the centered clean hero image during the transition handoff.
  // In the steady state the hero is just the case image with the brio overlay.
  const cleanImgVisible = phase === "growing" || phase === "revealing";
  // Hide page content only while the overlay still fully covers the screen
  // (holding) or while it has just started shrinking. Reveal during the shrink
  // so by the time the floating hero lands, the destination is already in
  // place, no visible fade-in after the shrink completes.
  // In `direct` mode the overlay morphs straight from a small source rect to
  // the hero rect, so the destination must stay hidden during `moving` too,
  // otherwise the hero would already be visible while the overlay is still
  // growing into place.
  const heroOnly = phase === "holding" || (transition.direct && phase === "moving");

  // When navigating from this detail page to another case via a related-work
  // card, hide the page (no fade) once the floating image reaches fullscreen.
  const [hiddenForSlug, setHiddenForSlug] = useState<string | null>(null);

  useEffect(() => {
    if (
      transition.phase === "holding" &&
      transition.slug &&
      transition.slug !== project.slug
    ) {
      const id = window.setTimeout(
        () => setHiddenForSlug(project.slug),
        OVERLAY_GROW_MS,
      );
      return () => window.clearTimeout(id);
    }
    if (
      transition.slug === project.slug ||
      transition.phase === "idle" ||
      transition.phase === "done"
    ) {
      setHiddenForSlug(null);
    }
  }, [transition.phase, transition.slug, project.slug]);

  // Snap-hide only for the originating slug; brand-new destination mounts
  // never inherit a stale hidden state.
  const outgoingHidden = hiddenForSlug === project.slug;

  const transitionActive = transition.phase !== "idle";

  return (
    <article
      className={cn("bg-[#f3f2ef]", outgoingHidden && "opacity-0")}
      style={{ color: "#2D2928" }}
    >
      {/* HERO: clean case image at 2/3 viewport height. */}
      <section ref={heroWrapRef} className="relative w-full h-[70vh] overflow-hidden" style={{ zIndex: 50 }}>
        <img
          ref={cleanImgRef}
          src={caseImages[project.slug] ?? caseImages.bmw}
          alt={`${project.client}, ${project.title}`}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: heroOnly ? 0 : 1 }}
          decoding="sync"
          fetchPriority="high"
        />
      </section>

      {/* HEADER, below the hero */}
      <header
        className={cn(
          "relative px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 text-[#2D2928] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          heroOnly
            ? "opacity-0 translate-y-6 blur-[6px]"
            : "opacity-100 translate-y-0 blur-0",
        )}
        style={{ transitionDuration: "700ms", transitionDelay: heroOnly ? "0ms" : "80ms" }}
      >
        <div className="grid grid-cols-6 gap-3 md:gap-5 items-start">
          <div
            className="col-span-6 md:col-start-1 md:col-span-1 pl-0 md:pl-[var(--cpl)]"
            style={{ "--cpl": `${clientPaddingLeft}px` } as CSSProperties}
          >
            <img
              src={caseImages[project.slug] ?? caseImages.bmw}
              alt={`${project.client}, ${project.title} thumbnail`}
              className="w-full aspect-square object-cover"
            />
          </div>
          <div className="col-span-6 md:col-start-1 md:col-span-1">
            <p className="font-title">{project.client}</p>
          </div>
          <div className="col-span-6 md:col-start-3 md:col-span-2 font-nav">
            {project.pillars.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="col-span-3 md:col-start-5 md:col-span-1 font-nav">
            <p>{project.year}</p>
          </div>
          <div className="col-span-3 md:col-start-6 md:col-span-1 font-nav">
            <p className="md:text-right">BRGD.001</p>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "transition-opacity ease-out",
          heroOnly ? "opacity-0" : "opacity-100",
        )}
        style={{ transitionDuration: "400ms", transitionDelay: heroOnly ? "0ms" : "180ms" }}
      >
      <ScrollPhysicsGroup>
      {/* Case story — editor-composed stream of richText, image, video,
          quote and stat blocks via the Sanity body[] pageBuilder. */}
      {body.map((block) => (
        <BlockRenderer key={block._key} block={block} />
      ))}
      <div className="ws-2" />

      {/* RELATED WORK */}
      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />
      </div>
      <PillarCasesCarousel
        perPage={2}
        title="RELATED CASES"
        ctaTo="/work"
        ctaLabel="(All work)"
        projects={(work?.related ?? [])
          .filter((r) => r?.slug && r.slug !== slug)
          .map<Project>((r) => ({
            slug: r.slug as string,
            title: r.name ?? "",
            client: r.client ?? r.name ?? "",
            year: r.year ?? new Date().getFullYear(),
            pillars: ((r.serviceCategories ?? [])
              .map((e) => e?.name)
              .filter(Boolean) as string[]) as Pillar[],
            clickable: true,
            featured: r.featured ?? undefined,
            tagline: r.intro ?? undefined,
          }))}
      />
      <div className="ws-2" />
      </ScrollPhysicsGroup>
      </div>
    </article>
  );
};

const HeroScroll = ({ children }: { children: React.ReactNode }) => {
  const triggerRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ticking = false;
    const apply = () => {
      ticking = false;
      const el = triggerRef.current;
      const wrap = wrapRef.current;
      if (!el || !wrap) return;
      const rect = el.getBoundingClientRect();
      const distance = el.offsetHeight - wrap.offsetHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), distance);
      const p = distance > 0 ? scrolled / distance : 0;
      const lerp = (a: number, b: number) => a + (b - a) * p;
      wrap.style.setProperty("--padX", `${lerp(0, 2.5)}rem`);
      wrap.style.setProperty("--padT", `${lerp(0, 4.5)}rem`);
      wrap.style.setProperty("--padB", `${lerp(0, 2.5)}rem`);
      wrap.style.setProperty(
        "--imgH",
        `calc(66.6667vh - ${lerp(0, 4.5)}rem - ${lerp(0, 2.5)}rem)`
      );
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <section ref={triggerRef} className="relative w-full" style={{ height: "133.3334vh" }}>
      <div
        ref={wrapRef}
        className="sticky top-0 w-full overflow-hidden"
        style={{
          height: "66.6667vh",
          paddingLeft: "var(--padX, 0rem)",
          paddingRight: "var(--padX, 0rem)",
          paddingTop: "var(--padT, 0rem)",
          paddingBottom: "var(--padB, 0rem)",
        }}
      >
        <div className="w-full" style={{ height: "var(--imgH, 66.6667vh)" }}>
          {children}
        </div>
      </div>
    </section>
  );
};

interface MoreWorkCardProps {
  project: Project;
  index: number;
  transitionActive: boolean;
}

const MoreWorkCard = ({ project: p, index, transitionActive }: MoreWorkCardProps) => {
  const thumbRef = useRef<WorkThumbHandle>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const navigate = (to: string) => router.push(to);
  const service = p.pillars.join(", ");
  const num = `Brgd.${String(index + 1).padStart(3, "0")}`;

  const handleClick = (e: MouseEvent) => {
    if (!p.clickable) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (transitionActive) return;
    e.preventDefault();
    const el = imageRef.current;
    if (!el) {
      navigate(`/work/${p.slug}`);
      return;
    }
    const rect = el.getBoundingClientRect();
    const imageSrc = caseImages[p.slug];
    if (!imageSrc) {
      navigate(`/work/${p.slug}`);
      return;
    }
    workTransition.start({
      slug: p.slug,
      imageSrc,
      sourceRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    });
    window.setTimeout(() => {
      navigate(`/work/${p.slug}`);
    }, 350);
  };

  const inner = (
    <Appear as="figure" from="up" distance={40} duration={900} threshold={0.12} className={cn("block group")}>
      <div ref={imageRef} className="relative w-full overflow-hidden aspect-[4/3]">
        <WorkThumb
          ref={thumbRef}
          pillars={p.pillars}
          seed={p.slug}
          fill
          imperative
          quadtoneId="brio-four"
          brioPresetId="strong"
          preserveColor
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <figcaption className="mt-2 font-meta text-[#2D2928] relative h-6 overflow-hidden">
        <span
          className="absolute inset-0 translate-y-0 group-hover:-translate-y-2 opacity-100 group-hover:opacity-0 transition-all duration-300 ease-out"
          style={{ transitionDelay: "60ms" }}
        >
          {num}
        </span>
        <span className="absolute inset-0 flex items-center justify-between gap-4 pointer-events-none">
          <span
            className="inline-block translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out"
            style={{ transitionDelay: "60ms" }}
          >
            {p.client}
          </span>
          <span
            className="inline-block translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-out font-nav"
            style={{ transitionDelay: "180ms" }}
          >
            {service}
          </span>
        </span>
      </figcaption>
    </Appear>
  );
  return p.clickable ? (
    <Link href={`/work/${p.slug}`} onClick={handleClick} className="block">
      {inner}
    </Link>
  ) : (
    <div className="block cursor-default">{inner}</div>
  );
};

export default WorkDetail;