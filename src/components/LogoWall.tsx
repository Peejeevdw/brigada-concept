"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Logo Wall Cycle — React port of the Osmo Supply resource. The original
// data-attribute hooks, GSAP timeline and slide-and-fade swap behaviour are
// preserved verbatim; only the init is scoped to this component's root ref and
// torn down on unmount. CSS lives in index.css (.logo-wall*). Logos rotate
// through the visible grid; extra logos beyond the visible count are hidden via
// CSS and cycled in over time.

export interface LogoWallItem {
  src: string;
  alt?: string;
}

const LogoWall = ({
  logos,
  shuffleFront = false,
}: {
  logos: LogoWallItem[];
  shuffleFront?: boolean;
}) => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const loopDelay = 1.5; // Loop Duration
    const duration = 0.9; // Animation Duration

    const list = root.querySelector<HTMLElement>("[data-logo-wall-list]");
    if (!list) return;
    const items = Array.from(
      list.querySelectorAll<HTMLElement>("[data-logo-wall-item]"),
    );

    const originalTargets = items
      .map((item) => item.querySelector<HTMLElement>("[data-logo-wall-target]"))
      .filter(Boolean) as HTMLElement[];

    let visibleItems: HTMLElement[] = [];
    let visibleCount = 0;
    let pool: HTMLElement[] = [];
    let pattern: number[] = [];
    let patternIndex = 0;
    let tl: gsap.core.Timeline | null = null;

    function isVisible(el: HTMLElement) {
      return window.getComputedStyle(el).display !== "none";
    }

    function shuffleArray<T>(arr: T[]) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function setup() {
      if (tl) tl.kill();
      visibleItems = items.filter(isVisible);
      visibleCount = visibleItems.length;

      pattern = shuffleArray(
        Array.from({ length: visibleCount }, (_, i) => i),
      );
      patternIndex = 0;

      // remove all injected targets
      items.forEach((item) => {
        item
          .querySelectorAll("[data-logo-wall-target]")
          .forEach((old) => old.remove());
      });

      pool = originalTargets.map((n) => n.cloneNode(true) as HTMLElement);

      let front: HTMLElement[];
      let rest: HTMLElement[];
      if (shuffleFront) {
        const shuffledAll = shuffleArray(pool);
        front = shuffledAll.slice(0, visibleCount);
        rest = shuffleArray(shuffledAll.slice(visibleCount));
      } else {
        front = pool.slice(0, visibleCount);
        rest = shuffleArray(pool.slice(visibleCount));
      }
      pool = front.concat(rest);

      for (let i = 0; i < visibleCount; i++) {
        const parent =
          visibleItems[i].querySelector<HTMLElement>(
            "[data-logo-wall-target-parent]",
          ) || visibleItems[i];
        parent.appendChild(pool.shift()!);
      }

      tl = gsap.timeline({ repeat: -1, repeatDelay: loopDelay });
      tl.call(swapNext);
      tl.play();
    }

    function swapNext() {
      const nowCount = items.filter(isVisible).length;
      if (nowCount !== visibleCount) {
        setup();
        return;
      }
      if (!pool.length) return;

      const idx = pattern[patternIndex % visibleCount];
      patternIndex++;

      const container = visibleItems[idx];
      const parent =
        container.querySelector<HTMLElement>("[data-logo-wall-target-parent]") ||
        container.querySelector<HTMLElement>(
          "*:has(> [data-logo-wall-target])",
        ) ||
        container;
      const existing = parent.querySelectorAll("[data-logo-wall-target]");
      if (existing.length > 1) return;

      const current = parent.querySelector<HTMLElement>(
        "[data-logo-wall-target]",
      );
      const incoming = pool.shift()!;

      gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
      parent.appendChild(incoming);

      if (current) {
        gsap.to(current, {
          yPercent: -50,
          autoAlpha: 0,
          duration,
          ease: "expo.inOut",
          onComplete: () => {
            current.remove();
            pool.push(current);
          },
        });
      }

      gsap.to(incoming, {
        yPercent: 0,
        autoAlpha: 1,
        duration,
        delay: 0.1,
        ease: "expo.inOut",
      });
    }

    setup();

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => tl?.play(),
      onLeave: () => tl?.pause(),
      onEnterBack: () => tl?.play(),
      onLeaveBack: () => tl?.pause(),
    });

    const onVisibility = () =>
      document.hidden ? tl?.pause() : tl?.play();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      tl?.kill();
      st.kill();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [logos, shuffleFront]);

  return (
    <div
      ref={rootRef}
      data-logo-wall-shuffle={shuffleFront ? "true" : "false"}
      data-logo-wall-cycle-init=""
      className="logo-wall"
    >
      <div className="logo-wall__collection">
        <div data-logo-wall-list="" className="logo-wall__list">
          {logos.map((logo, i) => (
            <div
              key={`${logo.src}-${i}`}
              data-logo-wall-item=""
              className="logo-wall__item"
            >
              <div
                data-logo-wall-target-parent=""
                className="logo-wall__logo"
              >
                <div className="logo-wall__logo-before" />
                <div data-logo-wall-target="" className="logo-wall__logo-target">
                  <img
                    src={logo.src}
                    loading="lazy"
                    width={100}
                    alt={logo.alt ?? ""}
                    className="logo-wall__logo-img"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LogoWall;
