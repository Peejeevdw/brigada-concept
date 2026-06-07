import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect on the client, useEffect on the server (avoids the SSR warning).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Drives the document canvas (the <html> background) to a page's own theme
 * colour while the page is mounted, restoring the previous value on unmount.
 *
 * Why: <html> carries a background, so it — not <body> — is the canvas the
 * browser paints behind everything. During a page crossfade there's a brief
 * gap where the outgoing page sits at opacity 0 (or the incoming one hasn't
 * painted yet) and that canvas shows through. A single global dark canvas
 * therefore flashed black on the way to light pages like /work. Letting each
 * dark page (the homepage, dark cases) claim its own canvas keeps the gap
 * matching the page instead of flashing. Light pages just use the light CSS
 * default, so they need no call.
 *
 * Runs as a layout effect so the colour is committed before the browser paints
 * the new page — avoids the inverse (a light flash entering a dark page).
 */
export function useCanvasColor(color: string) {
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;
    const prev = root.style.backgroundColor;
    root.style.backgroundColor = color;
    return () => {
      root.style.backgroundColor = prev;
    };
  }, [color]);
}
