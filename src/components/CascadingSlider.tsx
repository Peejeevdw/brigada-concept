import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const productCase1 = "/assets/product-case-1.png";
const productCase2 = "/assets/product-case-2.png";
const productCase3 = "/assets/product-case-3.png";
const productCase5 = "/assets/product-case-5.png";

// Osmo Supply "Cascading Slider" — ported to React. The animation logic
// (duration/ease/breakpoints + measure/getSlideProps/layout/goTo) is kept
// exactly as shipped; only the lifecycle is adapted: setupInstance is scoped to
// the component's wrapper ref and returns a cleanup that removes listeners,
// kills tweens and drops the auto-clones. The [data-*] hooks are unchanged.
// Slide markup is React; styling lives in index.css (Osmo block, heading font
// swapped to Antarctica).

export type CascadingSlide = { img: string; title: string };

// Placeholder product cases — swap images/titles for real ones later (same
// stand-in approach the orbit used).
const DEFAULT_SLIDES: CascadingSlide[] = [
  { img: productCase1, title: "Placeholder" },
  { img: productCase2, title: "Placeholder" },
  { img: productCase3, title: "Placeholder" },
  { img: productCase5, title: "Placeholder" },
];

const CascadingSlider = ({
  slides = DEFAULT_SLIDES,
  ariaLabel = "Featured work",
}: {
  slides?: CascadingSlide[];
  ariaLabel?: string;
} = {}) => {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrapper = wrapRef.current;
    if (!wrapper) return;

    const duration = 0.65;
    const ease = "power3.inOut";

    const breakpoints = [
      { maxWidth: 479, activeWidth: 0.78, siblingWidth: 0.08 },
      { maxWidth: 767, activeWidth: 0.7, siblingWidth: 0.1 },
      { maxWidth: 991, activeWidth: 0.6, siblingWidth: 0.1 },
      { maxWidth: Infinity, activeWidth: 0.6, siblingWidth: 0.13 },
    ];

    const viewport = wrapper.querySelector<HTMLElement>("[data-cascading-viewport]")!;
    const prevButton = wrapper.querySelector<HTMLElement>("[data-cascading-slider-prev]");
    const nextButton = wrapper.querySelector<HTMLElement>("[data-cascading-slider-next]");
    const slideEls = Array.from(
      viewport.querySelectorAll<HTMLElement>("[data-cascading-slide]")
    );
    let totalSlides = slideEls.length;
    if (totalSlides === 0) return;

    const cloned: HTMLElement[] = [];
    if (totalSlides < 9) {
      const originalSlides = slideEls.slice();
      while (slideEls.length < 9) {
        originalSlides.forEach((original) => {
          const clone = original.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-clone", "");
          viewport.appendChild(clone);
          slideEls.push(clone);
          cloned.push(clone);
        });
      }
      totalSlides = slideEls.length;
    }

    let activeIndex = 0;
    let isAnimating = false;
    let slideWidth = 0;
    const slotCenters: Record<string, number> = {};
    const slotWidths: Record<string, number> = {};

    function readGap() {
      const raw = getComputedStyle(viewport).getPropertyValue("--gap").trim();
      if (!raw) return 0;
      const temp = document.createElement("div");
      temp.style.width = raw;
      temp.style.position = "absolute";
      temp.style.visibility = "hidden";
      viewport.appendChild(temp);
      const px = temp.offsetWidth;
      viewport.removeChild(temp);
      return px;
    }

    function getSettings() {
      const windowWidth = window.innerWidth;
      for (let i = 0; i < breakpoints.length; i++) {
        if (windowWidth <= breakpoints[i].maxWidth) return breakpoints[i];
      }
      return breakpoints[breakpoints.length - 1];
    }

    function getOffset(slideIndex: number, fromIndex?: number) {
      if (fromIndex === undefined) fromIndex = activeIndex;
      let distance = slideIndex - fromIndex;
      const half = totalSlides / 2;
      if (distance > half) distance -= totalSlides;
      if (distance < -half) distance += totalSlides;
      return distance;
    }

    function measure() {
      const settings = getSettings();
      const viewportWidth = viewport.offsetWidth;
      const gap = readGap();

      const activeSlideWidth = viewportWidth * settings.activeWidth;
      const siblingSlideWidth = viewportWidth * settings.siblingWidth;
      const farSlideWidth = Math.max(
        0,
        (viewportWidth - activeSlideWidth - 2 * siblingSlideWidth - 4 * gap) / 2
      );

      slideWidth = activeSlideWidth;

      const visibleSlots = [
        { slot: -2, width: farSlideWidth },
        { slot: -1, width: siblingSlideWidth },
        { slot: 0, width: activeSlideWidth },
        { slot: 1, width: siblingSlideWidth },
        { slot: 2, width: farSlideWidth },
      ];

      let x = 0;
      visibleSlots.forEach((def, i) => {
        slotCenters[String(def.slot)] = x + def.width / 2;
        slotWidths[String(def.slot)] = def.width;
        if (i < visibleSlots.length - 1) x += def.width + gap;
      });

      slotCenters["-3"] = slotCenters["-2"] - farSlideWidth / 2 - gap - farSlideWidth / 2;
      slotWidths["-3"] = farSlideWidth;
      slotCenters["3"] = slotCenters["2"] + farSlideWidth / 2 + gap + farSlideWidth / 2;
      slotWidths["3"] = farSlideWidth;

      slideEls.forEach((slide) => {
        slide.style.width = slideWidth + "px";
      });
    }

    function getSlideProps(offset: number) {
      const clamped = Math.max(-3, Math.min(3, offset));
      const slotWidth = slotWidths[String(clamped)];
      const clipAmount = Math.max(0, (slideWidth - slotWidth) / 2);
      const translateX = slotCenters[String(clamped)] - slideWidth / 2;

      return {
        x: translateX,
        "--clip": clipAmount,
        zIndex: 10 - Math.abs(clamped),
      };
    }

    function layout(animate: boolean, previousIndex?: number) {
      slideEls.forEach((slide, index) => {
        const offset = getOffset(index);

        if (offset < -3 || offset > 3) {
          if (animate && previousIndex !== undefined) {
            const previousOffset = getOffset(index, previousIndex);
            if (previousOffset >= -2 && previousOffset <= 2) {
              const exitSlot = previousOffset < 0 ? -3 : 3;
              gsap.to(
                slide,
                Object.assign({}, getSlideProps(exitSlot), {
                  duration: duration,
                  ease: ease,
                  overwrite: true,
                })
              );
              return;
            }
          }

          const parkSlot = offset < 0 ? -3 : 3;
          gsap.set(slide, getSlideProps(parkSlot));
          return;
        }

        const props = getSlideProps(offset);
        slide.setAttribute("data-status", offset === 0 ? "active" : "inactive");

        if (animate) {
          gsap.to(
            slide,
            Object.assign({}, props, {
              duration: duration,
              ease: ease,
              overwrite: true,
            })
          );
        } else {
          gsap.set(slide, props);
        }
      });
    }

    function goTo(targetIndex: number) {
      const normalizedTarget = ((targetIndex % totalSlides) + totalSlides) % totalSlides;
      if (isAnimating || normalizedTarget === activeIndex) return;
      isAnimating = true;

      const previousIndex = activeIndex;
      const travelDirection = getOffset(normalizedTarget, previousIndex) > 0 ? 1 : -1;

      slideEls.forEach((slide, index) => {
        const currentOffset = getOffset(index, previousIndex);
        const nextOffset = getOffset(index, normalizedTarget);
        const wasInRange = currentOffset >= -3 && currentOffset <= 3;
        const willBeVisible = nextOffset >= -2 && nextOffset <= 2;

        if (!wasInRange && willBeVisible) {
          const entrySlot = travelDirection > 0 ? 3 : -3;
          gsap.set(slide, getSlideProps(entrySlot));
        }

        const wasInvisible = Math.abs(currentOffset) >= 3;
        const willBeStaging = Math.abs(nextOffset) === 3;
        const crossesSides = currentOffset * nextOffset < 0;
        if (wasInvisible && willBeStaging && crossesSides) {
          gsap.set(slide, getSlideProps(nextOffset > 0 ? 3 : -3));
        }
      });

      activeIndex = normalizedTarget;
      layout(true, previousIndex);
      gsap.delayedCall(duration + 0.05, () => {
        isAnimating = false;
      });
    }

    const onPrev = () => goTo(activeIndex - 1);
    const onNext = () => goTo(activeIndex + 1);
    if (prevButton) prevButton.addEventListener("click", onPrev);
    if (nextButton) nextButton.addEventListener("click", onNext);

    const slideHoverCleanups = slideEls.map((slide, index) => {
      const handler = () => {
        if (index !== activeIndex) goTo(index);
      };
      slide.addEventListener("mouseenter", handler);
      return () => slide.removeEventListener("mouseenter", handler);
    });

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goTo(activeIndex - 1);
      if (event.key === "ArrowRight") goTo(activeIndex + 1);
    };
    document.addEventListener("keydown", onKeydown);

    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        measure();
        layout(false);
      }, 100);
    };
    window.addEventListener("resize", onResize);

    measure();
    layout(false);

    return () => {
      if (prevButton) prevButton.removeEventListener("click", onPrev);
      if (nextButton) nextButton.removeEventListener("click", onNext);
      slideHoverCleanups.forEach((fn) => fn());
      document.removeEventListener("keydown", onKeydown);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      gsap.killTweensOf(slideEls);
      cloned.forEach((node) => node.remove());
    };
  }, [slides]);

  return (
    <div
      data-cascading-slider-wrap
      ref={wrapRef}
      className="cascading-slider"
      aria-label={ariaLabel}
      aria-roledescription="carousel"
    >
      <div className="cascading-slider__collection">
        <div data-cascading-viewport className="cascading-slider__list">
          {slides.map((s, i) => (
            <div
              key={`${s.title}-${i}`}
              aria-roledescription="slide"
              data-cascading-slide
              role="group"
              className="cascading-slider__item"
            >
              <div className="cascading-slider__item-inner">
                <div className="cascading-slider__item-bg">
                  <img
                    src={s.img}
                    loading={i === 0 ? "eager" : "lazy"}
                    draggable={false}
                    alt={s.title}
                    className="cascading-slider__img"
                  />
                </div>
                <div className="cascading-slider__item-content">
                  <h3 className="cascading-slider__h">{s.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CascadingSlider;
