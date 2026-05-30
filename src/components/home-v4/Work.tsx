import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import WorkThumb, { type Pillar, type WorkThumbHandle } from "@/components/wireframe/WorkThumb";
import { projects as allProjects } from "@/data/projects";
import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";

interface WorkProps {
  filterPillar?: Pillar;
  title?: string;
  eyebrow?: string;
  showAllLink?: boolean;
}

const Work = ({
  filterPillar,
  title = "Selected work",
  eyebrow = "Work",
  showAllLink = true,
}: WorkProps) => {
  const source = filterPillar
    ? allProjects.filter((p) => p.pillars.includes(filterPillar))
    : allProjects;

  const featured = source.filter((p) => p.featured);
  const rest = source.filter((p) => !p.featured);
  const projects = [...featured, ...rest].slice(0, 6);
  const SET_REPEATS = 3;
  const displayProjects =
    projects.length > 0
      ? Array.from({ length: SET_REPEATS }).flatMap(() => projects)
      : projects;

  const allWorkHref = filterPillar ? `/work?pillars=${filterPillar}` : "/work";

  const scrollerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const thumbRefs = useRef<Array<WorkThumbHandle | null>>([]);
  const lastScaleRef = useRef<number[]>([]);
  const rafRef = useRef(0);
  const setWidthRef = useRef(0);
  const activeIndexRef = useRef(0);
  const pausedRef = useRef(false);
  const animatingRef = useRef(false);
  const scrollEndTimerRef = useRef<number | null>(null);
  const userInteractingRef = useRef(false);
  const interactionTimerRef = useRef<number | null>(null);
  const autoAdvanceTimerRef = useRef<number | null>(null);
  const resetAutoAdvanceRef = useRef<() => void>(() => {});
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const computeSetWidth = () => {
    const el = scrollerRef.current;
    if (!el || projects.length < 1 || itemRefs.current.length < projects.length + 1) return 0;
    const first = itemRefs.current[0];
    const nextSetFirst = itemRefs.current[projects.length];
    if (!first || !nextSetFirst) return 0;
    return nextSetFirst.offsetLeft - first.offsetLeft;
  };

  const recenter = () => {
    // Keep the user inside the middle copy so it feels truly infinite. When
    // we cross into the first or last copy, silently jump back by one set.
    const el = scrollerRef.current;
    const setW = setWidthRef.current;
    if (!el || setW <= 0 || projects.length === 0) return;
    if (animatingRef.current) return;
    if (el.scrollLeft < setW * 0.5) {
      jumpScrollLeft(el, el.scrollLeft + setW);
      activeIndexRef.current += projects.length;
    } else if (el.scrollLeft > setW * 1.5) {
      jumpScrollLeft(el, el.scrollLeft - setW);
      activeIndexRef.current -= projects.length;
    }
  };

  // Instantly set scrollLeft, bypassing the CSS `scroll-behavior: smooth`
  // that would otherwise animate the jump backwards.
  const jumpScrollLeft = (el: HTMLElement, value: number) => {
    const prev = el.style.scrollBehavior;
    el.style.scrollBehavior = "auto";
    el.scrollLeft = value;
    // Force a reflow before restoring so the new value is committed instantly.
    void el.offsetWidth;
    el.style.scrollBehavior = prev;
  };

  const getItemUnscaledLeft = (item: HTMLElement) => {
    // With transform-origin: left center, the rendered left edge equals the
    // unscaled left edge.
    return item.getBoundingClientRect().left;
  };

  const getSnapScrollLeft = (item: HTMLElement) => {
    const el = scrollerRef.current;
    if (!el) return 0;

    const cs = window.getComputedStyle(el);
    const pad = parseFloat(cs.scrollPaddingLeft) || 0;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;

    return Math.max(0, Math.min(item.offsetLeft - pad, maxScrollLeft));
  };

  const getSnapDelta = (item: HTMLElement) => {
    const el = scrollerRef.current;
    if (!el) return 0;
    return getSnapScrollLeft(item) - el.scrollLeft;
  };

  const getNearestSnapIndex = () => {
    const el = scrollerRef.current;
    if (!el) return 0;

    let bestIdx = activeIndexRef.current;
    let bestDist = Infinity;

    for (let i = 0; i < itemRefs.current.length; i++) {
      const item = itemRefs.current[i];
      if (!item) continue;
      const dist = Math.abs(el.scrollLeft - getSnapScrollLeft(item));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  const settleToNearestSnap = () => {
    const el = scrollerRef.current;
    const nearestIndex = getNearestSnapIndex();
    const item = itemRefs.current[nearestIndex];
    if (!el || !item) return;

    activeIndexRef.current = nearestIndex;

    const delta = getSnapDelta(item);
    if (Math.abs(delta) <= 1) {
      animatingRef.current = false;
      measure();
      return;
    }

    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const canAdjustLeft = delta < 0 && el.scrollLeft > 1;
    const canAdjustRight = delta > 0 && el.scrollLeft < maxScrollLeft - 1;

    if (!canAdjustLeft && !canAdjustRight) {
      animatingRef.current = false;
      measure();
      return;
    }

    snapToIndex(nearestIndex, "smooth");
  };

  const snapToIndex = (index: number, behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    const item = itemRefs.current[index];
    if (!el || !item) return;

    const delta = getSnapDelta(item);
    if (Math.abs(delta) < 1) {
      recenter();
      measure();
      return;
    }

    animatingRef.current = behavior === "smooth";
    el.scrollBy({ left: delta, behavior });
  };


  const getAnchorX = () => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const cs = window.getComputedStyle(el);
    const pad = parseFloat(cs.scrollPaddingLeft) || 0;
    return rect.left + pad;
  };

  const syncScrollerInsets = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const isDesktop = window.innerWidth >= 768;
    const scrollerLeft = el.getBoundingClientRect().left;
    const titleLeft = titleRef.current?.getBoundingClientRect().left ?? scrollerLeft;
    const leftInset = isDesktop
      ? Math.max(0, titleLeft - scrollerLeft)
      : Math.max(24, el.clientWidth * 0.18);

    el.style.setProperty("--work-anchor-offset", `${leftInset}px`);

    el.style.setProperty("--work-tail-offset", `24px`);
  };

  const measure = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Anchor active tile's LEFT edge to the start of the 2/3 right column.
    const anchor = getAnchorX();

    let bestIdx = getNearestSnapIndex();
    let bestDist = Infinity;

    for (let i = 0; i < itemRefs.current.length; i++) {
      const item = itemRefs.current[i];
      if (!item) continue;
      const ir = item.getBoundingClientRect();
      const itemCenter = ir.left + ir.width / 2;
      // transform-origin: left center, so rendered left equals unscaled left.
      const unscaledLeft = ir.left;
      const dist = Math.abs(unscaledLeft - anchor);
      const snapDist = Math.abs(el.scrollLeft - getSnapScrollLeft(item));
      if (snapDist < bestDist) {
        bestDist = snapDist;
        bestIdx = i;
      }
    }
    activeIndexRef.current = bestIdx;
  };

  const markInteracting = () => {
    userInteractingRef.current = true;
    if (interactionTimerRef.current) {
      window.clearTimeout(interactionTimerRef.current);
    }
    interactionTimerRef.current = window.setTimeout(() => {
      userInteractingRef.current = false;
      interactionTimerRef.current = null;
    }, 1500);
    resetAutoAdvanceRef.current();
  };

  const onScroll = () => {
    // Defer the invisible wrap until scrolling has actually settled so we
    // don't fight an in-flight smooth scroll (which caused visible jumps).
    if (scrollEndTimerRef.current) {
      window.clearTimeout(scrollEndTimerRef.current);
    }
    scrollEndTimerRef.current = window.setTimeout(() => {
      scrollEndTimerRef.current = null;
      recenter();
      settleToNearestSnap();
    }, 160);

    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      measure();
    });
  };

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    syncScrollerInsets();
    setWidthRef.current = computeSetWidth();
    // Start in the middle copy so user can scroll backward and forward.
    if (projects.length > 0 && itemRefs.current[projects.length]) {
      el.scrollLeft = getSnapScrollLeft(itemRefs.current[projects.length]!);
      activeIndexRef.current = projects.length;
    } else {
      el.scrollLeft = 0;
    }
    measure();
    const r = requestAnimationFrame(() => {
      syncScrollerInsets();
      setWidthRef.current = computeSetWidth();
      if (projects.length > 0 && itemRefs.current[projects.length]) {
        el.scrollLeft = getSnapScrollLeft(itemRefs.current[projects.length]!);
        activeIndexRef.current = projects.length;
      }
      measure();
    });
    return () => cancelAnimationFrame(r);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  useEffect(() => {
    const onResize = () => {
      syncScrollerInsets();
      setWidthRef.current = computeSetWidth();
      measure();
      snapToIndex(activeIndexRef.current, "auto");
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Track manual interaction so auto-advance pauses for ~1.5s.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      markInteracting();
      pointerDownRef.current = { x: e.clientX, y: e.clientY };
      draggedRef.current = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      const start = pointerDownRef.current;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 6) {
        draggedRef.current = true;
        markInteracting();
      }
    };
    const onPointerUp = () => {
      pointerDownRef.current = null;
    };
    const onTouchStart = () => markInteracting();
    const onKeyDown = () => markInteracting();

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("keydown", onKeyDown);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("keydown", onKeyDown);
      if (interactionTimerRef.current) {
        window.clearTimeout(interactionTimerRef.current);
      }
    };
  }, []);

  // Auto-advance to the next case every 4s; pause briefly on user interaction.
  useEffect(() => {
    if (projects.length === 0) return;

    const advance = () => {
      if (pausedRef.current || userInteractingRef.current) return;
      if (animatingRef.current) return;
      if (document.hidden) return;
      let current = activeIndexRef.current;
      // If we're nearing the end of the buffered copies, silently jump back
      // by one set so the scroller can keep moving forward forever.
      if (current >= projects.length * 2) {
        const target = itemRefs.current[current - projects.length];
        const el = scrollerRef.current;
        if (el && target) {
          jumpScrollLeft(el, getSnapScrollLeft(target));
          activeIndexRef.current = current - projects.length;
          current = activeIndexRef.current;
          measure();
        }
      }
      const next = current + 1;
      if (next >= itemRefs.current.length) return;
      snapToIndex(next, "smooth");
    };

    const start = () => {
      if (autoAdvanceTimerRef.current) return;
      autoAdvanceTimerRef.current = window.setInterval(advance, 4000);
    };
    const stop = () => {
      if (autoAdvanceTimerRef.current) {
        window.clearInterval(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };

    resetAutoAdvanceRef.current = () => {
      stop();
      start();
    };

    start();
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
      resetAutoAdvanceRef.current = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);


  return (
    <section ref={sectionRef} className="relative pb-16 md:pb-24">
      {showAllLink && (
        <div className="hidden md:block pointer-events-none absolute inset-0 px-6 md:px-10">
          <div className="grid grid-cols-3 gap-8 md:gap-24 h-full">
            <div className="sticky top-24 self-start pointer-events-auto h-fit">
              <Appear from="up" delay={120}>
                <Link
                  to={allWorkHref}
                  className="inline-flex items-center gap-2 text-lg md:text-2xl uppercase tracking-widest font-bold link-cta"
                >
                  (All work)
                  <ArrowUpRight className="w-6 h-6 md:w-8 md:h-8" strokeWidth={2.5} />
                </Link>
              </Appear>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 md:px-10 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 items-start mb-12 md:mb-16">
        <div className="hidden md:block" />
        <div ref={titleRef} className="md:col-span-2" />
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="overflow-x-auto no-scrollbar"
        style={{
          scrollPaddingLeft: "var(--work-anchor-offset, 18vw)",
          scrollPaddingRight: "var(--work-tail-offset, 12vw)",
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          overscrollBehaviorX: "contain",
          touchAction: "pan-x pan-y",
        } as CSSProperties}
      >
        <ul
          className="flex items-center gap-16 md:gap-24 pb-4"
          style={{
            paddingLeft: "var(--work-anchor-offset, 18vw)",
            paddingRight: "var(--work-tail-offset, 12vw)",
          } as CSSProperties}
        >
          {displayProjects.map((p, i) => {
            const expertise = `(${p.pillars.join(", ")})`;
            const card = (
              <>
                <div className="relative">
                  <WorkThumb
                    ref={(h) => (thumbRefs.current[i] = h)}
                    pillars={p.pillars}
                    seed={p.slug}
                    imperative
                  />
                  <div className="pointer-events-none absolute inset-0 z-20 p-4 md:p-5 flex flex-col justify-between text-white mix-blend-difference">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[10px] md:text-xs font-normal tracking-tight">
                        {expertise}
                      </span>
                      <h3 className="text-[10px] md:text-xs font-semibold uppercase tracking-wide">
                        {p.client}
                      </h3>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[10px] md:text-xs font-semibold uppercase tracking-wide">
                        {p.client}
                      </h3>
                      <span className="text-[10px] md:text-xs font-normal tracking-tight">
                        {expertise}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
            const handleClick = (e: React.MouseEvent) => {
              const el = scrollerRef.current;
              const item = itemRefs.current[i];
              if (!el || !item) return;
              // Swallow clicks that were actually drag gestures.
              if (draggedRef.current) {
                e.preventDefault();
                e.stopPropagation();
                draggedRef.current = false;
                return;
              }
              if (activeIndexRef.current !== i) {
                // Not the centered tile: scroll it into the center instead of navigating.
                e.preventDefault();
                e.stopPropagation();
                snapToIndex(i);
              }
            };
            return (
              <li
                key={`${p.slug}-${i}`}
                ref={(el) => (itemRefs.current[i] = el)}
                onMouseEnter={() => {
                  if (activeIndexRef.current === i) pausedRef.current = true;
                  thumbRefs.current[i]?.setEffect(1);
                }}
                onMouseLeave={() => {
                  pausedRef.current = false;
                  thumbRefs.current[i]?.setEffect(0);
                }}
                onClick={handleClick}
                className="shrink-0 w-[80vw] md:w-[50vw] cursor-pointer"
                style={{
                  scrollSnapAlign: "start",
                  scrollSnapStop: "always",
                }}
              >
                {p.clickable ? (
                  <Link to={`/work/${p.slug}`} className="block" tabIndex={-1}>
                    {card}
                  </Link>
                ) : (
                  <div className="block opacity-70">{card}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {showAllLink && (
        <div className="md:hidden px-6 mt-8">
          <Appear from="up">
            <Link
              to={allWorkHref}
              className="text-sm uppercase tracking-widest border-b border-neutral-900 pb-1 link-cta"
            >
              All work →
            </Link>
          </Appear>
        </div>
      )}
    </section>
  );
};

export default Work;
