import { useEffect, useRef, useState } from "react";
import { useWorkTransition, workTransition } from "@/lib/workTransition";

export const GROW_MS = 460;   // source rect -> fullscreen
export const SHRINK_MS = 560; // fullscreen -> target hero rect

type Stage = "source" | "full" | "target";

const WorkTransitionOverlay = () => {
  const t = useWorkTransition();
  const [stage, setStage] = useState<Stage>("source");
  const imgRef = useRef<HTMLImageElement>(null);

  // Grow from source rect to fullscreen as soon as we start holding.
  // In `direct` mode, skip the fullscreen stage and stay at `source` until
  // the target rect is known.
  useEffect(() => {
    if (t.phase === "holding" && !t.direct) {
      // Force a layout read on the floating image at its source rect so the
      // browser commits the starting geometry, THEN flip to "full" on the
      // next frame. Without this read both styles can collapse into a single
      // paint and the image appears to snap straight to fullscreen.
      let innerId: number | null = null;
      const r1 = requestAnimationFrame(() => {
        if (imgRef.current) {
          // Reading a layout property forces the source rect to be painted.
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          imgRef.current.getBoundingClientRect();
        }
        innerId = requestAnimationFrame(() => setStage("full"));
      });
      return () => {
        if (innerId !== null) cancelAnimationFrame(innerId);
        cancelAnimationFrame(r1);
      };
    }
    if (t.phase === "idle") {
      setStage("source");
    }
  }, [t.phase, t.direct]);

  // Once we know the target rect (set by WorkDetail on mount) and phase moves
  // to 'moving', shrink to the target.
  useEffect(() => {
    if (t.phase === "moving" && t.targetRect) {
      const r = requestAnimationFrame(() => setStage("target"));
      return () => cancelAnimationFrame(r);
    }
  }, [t.phase, t.targetRect]);

  // After the shrink (or direct grow) completes, hand off to detail page.
  useEffect(() => {
    if (t.phase !== "moving" || stage !== "target") return;
    const dur = t.direct ? GROW_MS : SHRINK_MS;
    const id = window.setTimeout(() => {
      workTransition.setPhase("growing");
    }, dur);
    return () => window.clearTimeout(id);
  }, [t.phase, stage, t.direct]);

  // Reset on done.
  useEffect(() => {
    if (t.phase !== "done") return;
    workTransition.reset();
  }, [t.phase]);

  // Lock page scroll for the duration of the transition.
  useEffect(() => {
    const active = t.phase !== "idle" && t.phase !== "done";
    if (!active) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const prevent = (e: Event) => e.preventDefault();
    window.addEventListener("wheel", prevent, { passive: false });
    window.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
      window.removeEventListener("wheel", prevent);
      window.removeEventListener("touchmove", prevent);
    };
  }, [t.phase]);

  if (
    (t.phase !== "holding" && t.phase !== "moving" && t.phase !== "growing") ||
    !t.imageSrc ||
    !t.sourceRect
  )
    return null;

  const fullRect =
    typeof window !== "undefined"
      ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }
      : { left: 0, top: 0, width: 0, height: 0 };

  let activeRect = t.sourceRect;
  if (stage === "source") activeRect = t.sourceRect;
  else if (stage === "full") activeRect = fullRect;
  else if (stage === "target" && t.targetRect) activeRect = t.targetRect;

  const growEase = "cubic-bezier(0.85, 0, 0.15, 1)";
  const shrinkEase = "cubic-bezier(0.34, 1.36, 0.4, 1)";
  let transition = "none";
  if (stage === "full")
    transition = `left ${GROW_MS}ms ${growEase}, top ${GROW_MS}ms ${growEase}, width ${GROW_MS}ms ${growEase}, height ${GROW_MS}ms ${growEase}`;
  else if (stage === "target") {
    // Direct mode morphs source -> target as a single grow, so use the
    // smooth grow easing instead of the overshoot shrink easing.
    const ease = t.direct ? growEase : shrinkEase;
    const dur = t.direct ? GROW_MS : SHRINK_MS;
    transition = `left ${dur}ms ${ease}, top ${dur}ms ${ease}, width ${dur}ms ${ease}, height ${dur}ms ${ease}`;
  }

  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 65, // above HorizontalCases (z:60), below home flow nav (z:70)
        pointerEvents: "none",
      }}
    >
      <img
        ref={imgRef}
        src={t.imageSrc}
        alt=""
        decoding="sync"
        style={{
          position: "absolute",
          left: activeRect.left,
          top: activeRect.top,
          width: activeRect.width,
          height: activeRect.height,
          objectFit: "cover",
          display: "block",
          transition,
          opacity: 1,
          willChange: "left, top, width, height",
          backfaceVisibility: "hidden",
        }}
      />
    </div>
  );
};

export default WorkTransitionOverlay;
