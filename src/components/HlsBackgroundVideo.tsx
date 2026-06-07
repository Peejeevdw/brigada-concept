import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * Muted, looping, autoplaying HLS (.m3u8) background video.
 *
 * A lightweight counterpart to BunnyReelLightbox — no controls, just a
 * full-bleed decorative video meant to sit behind text. Uses hls.js where
 * needed and Safari's native HLS otherwise; cleans up the hls instance on
 * unmount. Pass positioning/sizing via `className` (e.g. "absolute inset-0
 * h-full w-full object-cover").
 */
const HlsBackgroundVideo = ({
  src,
  className = "",
  poster,
  onPlaying,
}: {
  src: string;
  className?: string;
  poster?: string;
  // Fires once the first frame has actually been painted (first `timeupdate`),
  // so an overlaying poster can fade away without exposing a black gap.
  onPlaying?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Background video must be muted to satisfy autoplay policies.
    video.muted = true;
    video.playsInline = true;

    const onFirstFrame = () => onPlaying?.();
    video.addEventListener("timeupdate", onFirstFrame, { once: true });

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.then === "function") p.catch(() => {});
    };

    const isSafariNative = !!video.canPlayType("application/vnd.apple.mpegurl");
    let hls: Hls | null = null;

    if (isSafariNative) {
      video.src = src;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    } else if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 10 });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
    } else {
      video.src = src;
      video.addEventListener("loadedmetadata", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("timeupdate", onFirstFrame);
      if (hls) {
        try { hls.destroy(); } catch (_) { /* noop */ }
      }
      try { video.pause(); } catch (_) { /* noop */ }
    };
  }, [src, onPlaying]);

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      loop
      autoPlay
      playsInline
      poster={poster}
      aria-hidden
    />
  );
};

export default HlsBackgroundVideo;
