// Coordinates hero media with the intro Preloader so a direct page load doesn't
// start the hero video behind the overlay (you'd miss the first seconds). The
// Preloader fires PRELOADER_DISMISS_EVENT the moment it begins sliding away.

export const PRELOADER_DISMISS_EVENT = "brigada:preloader-dismiss";

/**
 * Runs `onReveal` when it's time for the hero to show its opening frame:
 * - No preloader active on this load (e.g. internal navigation) → run NOW.
 * - Preloader covering the page (direct load) → run when it starts dismissing.
 *
 * `onReveal` runs at most once. Returns a cleanup to drop the listener. A
 * safety timeout still fires it if the dismiss event never arrives, so the
 * video can never stay frozen.
 */
export function onPreloaderReveal(onReveal: () => void): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") {
    onReveal();
    return () => {};
  }
  const active = !!document.querySelector("[data-preloader]");
  if (!active) {
    onReveal();
    return () => {};
  }

  let done = false;
  let safety = 0;
  const fire = () => {
    if (done) return;
    done = true;
    window.removeEventListener(PRELOADER_DISMISS_EVENT, fire);
    window.clearTimeout(safety);
    onReveal();
  };
  window.addEventListener(PRELOADER_DISMISS_EVENT, fire);
  // Preloader's own MAX_VISIBLE_MS is 8000; give it a little more, then fire
  // anyway so a missed event never traps the video.
  safety = window.setTimeout(fire, 9000);
  return () => {
    done = true;
    window.removeEventListener(PRELOADER_DISMISS_EVENT, fire);
    window.clearTimeout(safety);
  };
}
