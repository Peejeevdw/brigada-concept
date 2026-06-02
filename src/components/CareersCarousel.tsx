import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";

import { cn } from "@/lib/utils";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

/**
 * Careers image carousel — adapted from Skiper UI "Skiper54 / Carousel_006"
 * (shadcn/ui Carousel + Embla + Framer Motion). Replaces the orbit section on
 * /careers-v2. The active slide expands (clip-path inset 15%→0) while its
 * neighbours peek; optional autoplay, arrow nav and pagination dots.
 *
 * Slides are the public/careers-{1..6}.png images (served via BASE_URL, like
 * the rest of the page). Titles are left empty for now — add a `title` per
 * slide to show the subtle caption beneath the active one.
 */
const BASE = "/";
const SLIDES: { src: string; alt: string; title: string }[] = [
  { src: `${BASE}careers-1.png`, alt: "Working at Brigada", title: "" },
  { src: `${BASE}careers-2.png`, alt: "Working at Brigada", title: "" },
  { src: `${BASE}careers-3.png`, alt: "Working at Brigada", title: "" },
  { src: `${BASE}careers-4.png`, alt: "Working at Brigada", title: "" },
  { src: `${BASE}careers-5.png`, alt: "Working at Brigada", title: "" },
  { src: `${BASE}careers-6.png`, alt: "Working at Brigada", title: "" },
];

const CareersCarousel = ({
  className,
  autoplay = true,
  loop = true,
  showNavigation = false,
  showPagination = false,
}: {
  className?: string;
  autoplay?: boolean;
  loop?: boolean;
  showNavigation?: boolean;
  showPagination?: boolean;
}) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // Hover-zone steering: hovering the left half scrolls left (prev), the right
  // half scrolls right (next). While steering we pause the autoplay plugin and
  // step in the hovered direction; leaving the carousel resumes autoplay.
  const stepTimer = useRef<number | null>(null);
  const dirRef = useRef<0 | -1 | 1>(0);
  const getAutoplay = useCallback(
    () =>
      (api?.plugins() as { autoplay?: { play: () => void; stop: () => void } } | undefined)
        ?.autoplay,
    [api],
  );

  const stopSteering = useCallback(() => {
    if (stepTimer.current !== null) {
      window.clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    dirRef.current = 0;
  }, []);

  const steer = useCallback(
    (dir: -1 | 1) => {
      if (!api || dirRef.current === dir) return; // only react to a direction change
      stopSteering();
      dirRef.current = dir;
      getAutoplay()?.stop();
      const step = () => (dir === -1 ? api.scrollPrev() : api.scrollNext());
      step(); // immediate feedback on enter / direction flip
      stepTimer.current = window.setInterval(step, 1000);
    },
    [api, getAutoplay, stopSteering],
  );

  // Resume default autoplay (used by the neutral middle zone and on leave).
  const release = useCallback(() => {
    if (dirRef.current === 0) return;
    stopSteering();
    getAutoplay()?.play();
  }, [stopSteering, getAutoplay]);

  const onMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const f = (e.clientX - rect.left) / rect.width;
      // Outer 30% on each side steers; the middle 40% is a neutral dead zone
      // where the carousel keeps its default autoplay.
      if (f < 0.3) steer(-1);
      else if (f > 0.7) steer(1);
      else release();
    },
    [steer, release],
  );

  const onMouseLeave = release;

  // Clean up the steering interval on unmount.
  useEffect(() => () => stopSteering(), [stopSteering]);

  return (
    <Carousel
      setApi={setApi}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative w-full pt-[clamp(8px,1.5vw,28px)] pb-[clamp(64px,9vw,140px)]",
        className,
      )}
      opts={{ loop, slidesToScroll: 1 }}
      plugins={
        autoplay
          ? [
              Autoplay({
                delay: 2500,
                // Always keep scrolling (no pause on hover). A click/drag only
                // interrupts it briefly — autoplay resumes afterwards.
                stopOnInteraction: false,
                stopOnMouseEnter: false,
              }),
            ]
          : []
      }
    >
      <CarouselContent className="flex h-[clamp(360px,56vh,560px)] w-full">
        {SLIDES.map((img, index) => (
          <CarouselItem
            key={index}
            className="relative flex h-[81.5%] w-full basis-[73%] items-center justify-center sm:basis-[50%] md:basis-[30%] lg:basis-[25%] xl:basis-[21%]"
          >
            <motion.div
              initial={false}
              animate={{
                clipPath:
                  current !== index
                    ? "inset(15% 0 15% 0)"
                    : "inset(0 0 0 0)",
              }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="h-full w-full overflow-hidden"
            >
              <div className="relative h-full w-full">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full scale-105 object-cover"
                />
              </div>
            </motion.div>
            <AnimatePresence mode="wait">
              {current === index && img.title && (
                <motion.div
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.5 }}
                  className="absolute bottom-0 left-2 flex h-[14%] w-full translate-y-full items-center justify-center p-2 text-center font-medium tracking-tight text-brigada-black/40"
                >
                  {img.title}
                </motion.div>
              )}
            </AnimatePresence>
          </CarouselItem>
        ))}
      </CarouselContent>

      {showNavigation && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex w-full items-center justify-between gap-2 px-4">
          <button
            aria-label="Previous slide"
            onClick={() => api?.scrollPrev()}
            className="pointer-events-auto rounded-full bg-brigada-black/10 p-2 transition-colors hover:bg-brigada-black/20"
          >
            <ChevronLeft className="text-white" />
          </button>
          <button
            aria-label="Next slide"
            onClick={() => api?.scrollNext()}
            className="pointer-events-auto rounded-full bg-brigada-black/10 p-2 transition-colors hover:bg-brigada-black/20"
          >
            <ChevronRight className="text-white" />
          </button>
        </div>
      )}

      {showPagination && (
        <div className="mt-8 flex w-full items-center justify-center">
          <div className="flex items-center justify-center gap-2">
            {SLIDES.map((_, index) => (
              <button
                key={index}
                onClick={() => api?.scrollTo(index)}
                className={cn(
                  "h-2 w-2 cursor-pointer rounded-full transition-all",
                  current === index ? "bg-brigada-black" : "bg-[#D9D9D9]",
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </Carousel>
  );
};

export default CareersCarousel;
