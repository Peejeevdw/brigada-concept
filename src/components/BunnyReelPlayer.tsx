"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

/**
 * Click-to-play HLS (.m3u8) reel — NO autoplay. Shows the poster with a centred
 * glass play button (Osmo "big-btn" look: blurred, translucent, hairline ring).
 * Clicking starts playback with sound; clicking the playing video pauses and
 * brings the button back. Reuses the same hls.js start-level tuning as
 * HlsBackgroundVideo, but defers segment loading until the first play so a reel
 * the visitor never starts costs no bandwidth.
 */
const BunnyReelPlayer = ({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster?: string;
  className?: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startedRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  // Attach HLS (or native) but do NOT load segments / play until the first click.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playsInline = true;

    let hls: Hls | null = null;

    // Prefer hls.js so we can pick the start level (see HlsBackgroundVideo for
    // the why). autoStartLoad:false keeps it from buffering before play.
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 30,
        capLevelToPlayerSize: true,
        autoStartLoad: false,
        testBandwidth: false,
        abrEwmaDefaultEstimate: 8_000_000,
        abrEwmaDefaultEstimateMax: 10_000_000,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls!.levels || [];
        if (levels.length) {
          // Highest-resolution level, then the smallest that still covers the
          // rendered box (height × dpr) — start sharp, no low-res flash.
          const highestIdx = levels.reduce(
            (best, l, i) => ((l.height || 0) > (levels[best].height || 0) ? i : best),
            0,
          );
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
          hls!.startLevel = idx;
        }
      });
      hlsRef.current = hls;
    } else {
      // Safari native HLS — only metadata until play.
      video.preload = "metadata";
      video.src = src;
    }

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
      if (hls) {
        try { hls.destroy(); } catch (_) { /* noop */ }
      }
      hlsRef.current = null;
    };
  }, [src]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) {
      // First play: a click is a user gesture, so we can unmute and start the
      // deferred HLS load.
      if (!startedRef.current) {
        startedRef.current = true;
        video.muted = false;
        hlsRef.current?.startLoad();
      }
      const p = video.play();
      if (p && typeof p.then === "function") p.catch(() => { /* noop */ });
    } else {
      video.pause();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        playsInline
        poster={poster}
        onClick={toggle}
      />
      {/* Glass play button — Osmo "big-btn": blurred, translucent, hairline ring.
          Hidden while playing; returns on pause/end as a resume affordance. */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pauzeer reel" : "Speel reel af"}
        className={`absolute left-1/2 top-1/2 flex h-[clamp(64px,7vw,104px)] w-[clamp(64px,7vw,104px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#646464]/20 p-[clamp(18px,2vw,30px)] text-white backdrop-blur-xl transition-opacity duration-300 ${
          playing ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-full w-full translate-x-[6%]">
          <path
            d="M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
};

export default BunnyReelPlayer;
