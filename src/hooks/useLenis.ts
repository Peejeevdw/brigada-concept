import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// Smooth-scroll setup shared by the new-style pages: Lenis drives GSAP
// ScrollTrigger each frame, with a prefers-reduced-motion fallback to native
// scroll. Pass `onScroll` to drive scroll-linked state (e.g. a background
// tint) — it fires every frame while smooth-scrolling and on the native
// scroll/resize events under reduced motion. The callback is read from a ref
// so the effect only runs once (no need to memoise it at the call site).
//
// Requires the `html.lenis` / `.lenis.lenis-smooth` CSS, which lives globally
// in index.css.
export function useLenis(onScroll?: () => void) {
  const cbRef = useRef(onScroll);
  cbRef.current = onScroll;

  useEffect(() => {
    const handle = () => cbRef.current?.();
    handle();
    window.addEventListener("resize", handle);

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", handle, { passive: true });
      return () => {
        window.removeEventListener("scroll", handle);
        window.removeEventListener("resize", handle);
      };
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", handle);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener("resize", handle);
    };
  }, []);
}
