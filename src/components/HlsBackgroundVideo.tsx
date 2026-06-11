import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import SoundCursorOverlay from "@/components/SoundCursorOverlay";
import { onPreloaderReveal } from "@/lib/preloader-gate";

/**
 * Muted, looping, autoplaying HLS (.m3u8) background video.
 *
 * A lightweight counterpart to BunnyReelLightbox — no controls by default, just
 * a full-bleed decorative video meant to sit behind text. Uses hls.js where
 * needed and Safari's native HLS otherwise; cleans up the hls instance on
 * unmount. Pass positioning/sizing via `className` (e.g. "absolute inset-0
 * h-full w-full object-cover").
 *
 * `soundToggle`: opt-in — renders a discreet mute/unmute button so a visitor
 * can turn the sound on (used on the press hero). The video still starts muted
 * to satisfy autoplay policy.
 *
 * `controls`: opt-in — show the browser's native player chrome (play/pause/
 * scrub/volume/fullscreen). The clip still starts as a muted autoplay loop, so
 * a visitor can pause or unmute it. Mirrors the Vimeo `controls` path; when on,
 * the element is interactive (no `aria-hidden`) and the custom mute button is
 * skipped since the native controls already carry volume.
 */
const HlsBackgroundVideo = ({
  src,
  className = "",
  poster,
  onPlaying,
  soundToggle = false,
  controls = false,
}: {
  src: string;
  className?: string;
  poster?: string;
  // Fires once the first frame has actually been painted (first `timeupdate`),
  // so an overlaying poster can fade away without exposing a black gap.
  onPlaying?: () => void;
  soundToggle?: boolean;
  controls?: boolean;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Background video must start muted to satisfy autoplay policies.
    video.muted = true;
    video.playsInline = true;

    const onFirstFrame = () => onPlaying?.();
    video.addEventListener("timeupdate", onFirstFrame, { once: true });

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.then === "function") p.catch(() => {});
    };

    let hls: Hls | null = null;

    // Prefer hls.js (MSE) so we control start level + ABR. Only fall back to
    // the browser's native HLS when hls.js can't run (iOS Safari). NOTE: some
    // desktop Chrome builds report canPlayType("…mpegurl") === "maybe", so the
    // native check must NOT come first — it would hijack Chrome and bypass our
    // tuning, making the hero start at a low rung.
    if (Hls.isSupported()) {
      // Start sharp instead of ramping up from the lowest rung. The default
      // `autoStartLoad` picks the first level before the manifest + player size
      // are known, so `capLevelToPlayerSize` can pin it to a low variant. We
      // defer loading (`autoStartLoad: false`), and once the manifest is parsed
      // we explicitly pick the best level that fits the rendered hero and force
      // it for the FIRST fragment — so there's no low-res flash. ABR (seeded
      // high, ceiling raised so the seed isn't capped to the 4 Mbit/s default)
      // still takes over afterwards and can drop down on a poor connection.
      const hlsInstance = new Hls({
        maxBufferLength: 30,
        capLevelToPlayerSize: true,
        autoStartLoad: false,
        testBandwidth: false,
        abrEwmaDefaultEstimate: 8_000_000,
        abrEwmaDefaultEstimateMax: 10_000_000,
      });
      hls = hlsInstance;
      hlsInstance.loadSource(src);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hlsInstance.levels || [];
        if (levels.length) {
          // Pick by actual resolution, NOT by array position — Bunny orders
          // its variants high→low, so indexing by position would pick the
          // lowest. Highest-resolution level overall:
          const highestIdx = levels.reduce(
            (best, l, i) => ((l.height || 0) > (levels[best].height || 0) ? i : best),
            0,
          );
          // Smallest level that still covers the rendered hero (height × dpr);
          // if none is big enough, or the size is unknown, use the highest.
          const dpr = window.devicePixelRatio || 1;
          const renderedH = video.clientHeight || video.offsetHeight || 0;
          const targetH = renderedH ? renderedH * dpr : Infinity;
          let idx = highestIdx;
          let bestFitH = Infinity;
          levels.forEach((l, i) => {
            const h = l.height || 0;
            if (h >= targetH && h < bestFitH) {
              bestFitH = h;
              idx = i;
            }
          });
          hlsInstance.startLevel = idx;
        }
        hlsInstance.startLoad();
        tryPlay();
      });
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    }

    // On a direct load the video buffers/plays muted behind the intro
    // preloader; snap it back to the start the moment the curtain lifts so the
    // opening isn't lost. On internal navigation (no preloader) this runs
    // immediately and is a no-op (already at 0).
    const cleanupReveal = onPreloaderReveal(() => {
      try { video.currentTime = 0; } catch (_) { /* noop */ }
      tryPlay();
    });

    return () => {
      cleanupReveal();
      video.removeEventListener("timeupdate", onFirstFrame);
      if (hls) {
        try { hls.destroy(); } catch (_) { /* noop */ }
      }
      try { video.pause(); } catch (_) { /* noop */ }
    };
  }, [src, onPlaying]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  };

  return (
    <>
      <video
        ref={videoRef}
        className={className}
        muted
        loop
        autoPlay
        playsInline
        poster={poster}
        controls={controls}
        // When the native controls are on the video is interactive, so it
        // shouldn't be hidden from assistive tech; otherwise it's decorative.
        aria-hidden={controls ? undefined : true}
      />
      {soundToggle && !controls && <SoundCursorOverlay muted={muted} onClick={toggleMute} />}
    </>
  );
};

export default HlsBackgroundVideo;
