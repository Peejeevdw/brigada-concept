import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SANS, EASE_OUT } from "@/lib/siteTokens";
import { useCoarsePointer } from "@/lib/useCoarsePointer";
import { usePageTransition } from "@/components/PageTransition";
import { caseImages } from "@/data/caseImages";
import { MediaFill, type Media } from "@/components/case-media";
const brandCrelan = "/assets/brand-case-crelan.png";
const brandNanopixel = "/assets/brand-case-nanopixel.png";
const marketingCrelan = "/assets/marketing-case-crelan.jpg";
const marketingMooimakers = "/assets/marketing-case-mooimakers.jpg";
const marketingCupra = "/assets/marketing-case-cupra.jpg";
const peoplePolitie = "/assets/people-case-politie.jpg";
const peopleLidl = "/assets/people-case-lidl.jpg";

// Osmo Supply "Basic Filter Setup (Multi Match)" — ported to React. The filter
// logic (token collection/match + the active/transition-out/not-active state
// machine with a 300ms transitionDelay) is kept exactly as shipped; only the
// lifecycle is adapted: it's scoped to the group ref in an effect and returns a
// cleanup that removes the click listener and clears pending timers. The
// [data-filter-*] hooks are unchanged. Markup is React; the show/hide transition
// CSS lives in index.css (Osmo block); card styling matches the work mockup.

export type WorkItem = {
  client: string;
  tags: string[];
  img: string | null;
  // Optional silent looping video thumbnail; falls back to `img` when absent.
  video?: Media | null;
  slug?: string;
};

const CATEGORIES = ["All", "Brand", "Marketing", "People", "Product"];

// Placeholder grid — tags spread across all pillars so no filter is ever empty.
// First card keeps the BMW tile; Brand cases use the Crelan / Nanopixel visuals;
// Marketing cases the Crelan / Mooimakers / Cupra visuals; People cases the
// Federale Politie / Lidl visuals. Swap for real projects later
// (src/data/projects.ts).
const DEFAULT_ITEMS: WorkItem[] = [
  { client: "BMW", tags: ["Product", "People"], img: caseImages.bmw },
  { client: "Crelan", tags: ["Brand", "Product"], img: brandCrelan },
  { client: "Nanopixel", tags: ["Brand"], img: brandNanopixel },
  { client: "Crelan", tags: ["Marketing", "Product"], img: marketingCrelan },
  { client: "Mooimakers", tags: ["Marketing", "People"], img: marketingMooimakers },
  { client: "Cupra", tags: ["Marketing"], img: marketingCupra },
  { client: "Federale Politie", tags: ["People"], img: peoplePolitie },
  { client: "Lidl", tags: ["People"], img: peopleLidl },
];

const WorkFilter = ({
  items = DEFAULT_ITEMS,
  categories = CATEGORIES,
}: {
  items?: WorkItem[];
  categories?: string[];
} = {}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const transitionTo = usePageTransition();

  // Custom cursor: a "Watch case" pill that trails the real cursor (with delay)
  // while hovering a case. The native cursor stays visible. Same setup as the
  // /concept page.
  const [hoverCase, setHoverCase] = useState<string | null>(null);
  const isCoarse = useCoarsePointer();
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const pillX = useSpring(cursorX, { stiffness: 180, damping: 17, mass: 0.7 });
  const pillY = useSpring(cursorY, { stiffness: 180, damping: 17, mass: 0.7 });
  useEffect(() => {
    if (isCoarse) return;
    const move = (e: PointerEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [cursorX, cursorY, isCoarse]);

  useEffect(() => {
    const group = wrapRef.current;
    if (!group) return;

    const transitionDelay = 300;
    const buttons = [...group.querySelectorAll<HTMLElement>("[data-filter-target]")];
    const itemEls = [...group.querySelectorAll<HTMLElement>("[data-filter-name]")];
    const timers = new Map<Element, number>();
    // Filtering swaps items to position:absolute, so the page height changes.
    // The footer's parallax ScrollTrigger caches its start/end on load, so it
    // breaks unless we recalc once the layout has settled (after the swap).
    let refreshTimer = 0;
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), transitionDelay + 60);
    };

    // cache tokens
    const itemTokens = new Map<Element, Set<string>>();
    itemEls.forEach((el) => {
      const tokens = (el.getAttribute("data-filter-name") || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      itemTokens.set(el, new Set(tokens));
    });

    // state helpers
    const setItemState = (el: HTMLElement, on: boolean) => {
      const next = on ? "active" : "not-active";
      if (el.getAttribute("data-filter-status") !== next) {
        el.setAttribute("data-filter-status", next);
        el.setAttribute("aria-hidden", on ? "false" : "true");
      }
    };
    const setButtonState = (btn: HTMLElement, on: boolean) => {
      const next = on ? "active" : "not-active";
      if (btn.getAttribute("data-filter-status") !== next) {
        btn.setAttribute("data-filter-status", next);
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    };

    let activeTarget: string | null = null;
    const itemMatches = (el: HTMLElement) => {
      if (!activeTarget || activeTarget === "all") return true;
      return itemTokens.get(el)!.has(activeTarget);
    };

    const paint = (rawTarget: string | null) => {
      const target = (rawTarget || "").trim().toLowerCase();
      activeTarget = !target || target === "all" ? "all" : target;

      itemEls.forEach((el) => {
        const pending = timers.get(el);
        if (pending) clearTimeout(pending);
        const next = itemMatches(el);
        const cur = el.getAttribute("data-filter-status");
        if (cur === "active" && transitionDelay > 0) {
          el.setAttribute("data-filter-status", "transition-out");
          timers.set(
            el,
            window.setTimeout(() => {
              setItemState(el, next);
              timers.delete(el);
            }, transitionDelay)
          );
        } else if (transitionDelay > 0) {
          timers.set(
            el,
            window.setTimeout(() => {
              setItemState(el, next);
              timers.delete(el);
            }, transitionDelay)
          );
        } else {
          setItemState(el, next);
        }
      });

      buttons.forEach((btn) => {
        const t = (btn.getAttribute("data-filter-target") || "").trim().toLowerCase();
        setButtonState(btn, (activeTarget === "all" && t === "all") || (!!t && t === activeTarget));
      });

      scheduleRefresh();
    };

    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-filter-target]");
      if (btn && group.contains(btn)) paint(btn.getAttribute("data-filter-target"));
    };
    group.addEventListener("click", onClick);

    // Honour `?filter=<pillar>` so the pillar pages can deep-link into a
    // pre-filtered /work view. Falls through to the default "All" tab when
    // the param is missing or doesn't match a category.
    const initial = new URLSearchParams(window.location.search).get("filter");
    if (initial) {
      const want = initial.trim().toLowerCase();
      const known = buttons.some(
        (b) => (b.getAttribute("data-filter-target") || "").trim().toLowerCase() === want,
      );
      if (known) paint(want);
    }

    return () => {
      group.removeEventListener("click", onClick);
      timers.forEach((id) => clearTimeout(id));
      clearTimeout(refreshTimer);
    };
  }, [items, categories]);

  return (
    <>
    <div data-filter-group role="group" ref={wrapRef} className="filter-group">
      <div className="filter-buttons">
        {categories.map((c, i) => (
          <button
            key={c}
            type="button"
            data-filter-target={c.toLowerCase()}
            data-filter-status={i === 0 ? "active" : "not-active"}
            aria-pressed={i === 0}
            aria-controls="work-filter-list"
            className="filter-btn"
          >
            {c}
          </button>
        ))}
      </div>
      <div id="work-filter-list" aria-live="polite" role="list" className="filter-list">
        {items.map((it, i) => (
          <div
            key={`${it.client}-${i}`}
            role="listitem"
            data-filter-name={it.tags.join(" ").toLowerCase()}
            data-filter-status="active"
            className="filter-list__item"
          >
            <a
              className="work-card"
              href={it.slug ? `/work/${it.slug}` : undefined}
              onClick={(e) => {
                if (!it.slug) return;
                e.preventDefault();
                transitionTo(`/work/${it.slug}`);
              }}
              style={{ color: "inherit", textDecoration: "none", cursor: it.slug ? "pointer" : "default" }}
              onPointerEnter={() => setHoverCase(it.client)}
              onPointerLeave={() => setHoverCase(null)}
            >
              <div className="work-card__visual">
                {it.video ? (
                  <MediaFill media={it.video} />
                ) : it.img ? (
                  <img
                    src={it.img}
                    alt={it.client}
                    loading="lazy"
                    draggable={false}
                    className="work-card__img"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="work-card__img flex items-center justify-center bg-[#e7e6e1] text-[#181614]/40"
                  >
                    <span
                      className="text-[clamp(10px,0.8vw,12px)] uppercase tracking-[0.14em]"
                      style={{ fontFamily: SANS, fontWeight: 500 }}
                    >
                      No thumbnail yet
                    </span>
                  </div>
                )}
              </div>
              <div className="work-card__meta">
                <h3 className="work-card__title">{it.client}</h3>
              </div>
            </a>
          </div>
        ))}
      </div>
    </div>

    {/* Custom cursor — delayed "Watch case" pill trailing the real cursor, the
        same as /concept. Pointer devices only (no cursor on touch). */}
    {!isCoarse && (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[100]"
      style={{ x: pillX, y: pillY }}
      aria-hidden
    >
      <div className="translate-x-4 translate-y-4">
        <AnimatePresence>
          {hoverCase && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="whitespace-nowrap rounded-full border border-white/15 bg-brigada-black/50 px-4 py-2 text-[13px] uppercase tracking-[0.12em] text-white backdrop-blur-md"
              style={{ fontFamily: SANS }}
            >
              {hoverCase}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
    )}
    </>
  );
};

export default WorkFilter;
