"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import Hls from "hls.js";

gsap.registerPlugin(Flip);

/**
 * Mini Showreel Player — React port of the Osmo resource, adapted to the hero.
 *
 * A bare reel thumbnail (poster + glass play button) sits inline; on click it
 * GSAP-Flips into a centred full-screen lightbox with a dark backdrop, and the
 * Bunny HLS reel plays. Esc / backdrop-click / the close button Flip it back and
 * pause+reset the video.
 *
 * The lightbox (backdrop + the Flip "player") is portalled to <body> so it
 * escapes the pinned hero's overflow-hidden / any transformed ancestor — Flip
 * animates between the thumbnail's viewport rect and the centred target rect.
 */
const PLAY_PATH =
  "M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z";

const GlassButton = ({
  hidden,
  onClick,
  label,
}: {
  hidden?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`absolute left-1/2 top-1/2 flex h-[clamp(28px,2.2vw,40px)] w-[clamp(28px,2.2vw,40px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#646464]/20 p-[clamp(8px,0.7vw,12px)] text-white backdrop-blur-xl transition-opacity duration-300 ${
      hidden ? "pointer-events-none opacity-0" : "opacity-100"
    }`}
  >
    <svg viewBox="0 0 24 24" fill="none" className="h-full w-full translate-x-[6%]">
      <path d={PLAY_PATH} fill="currentColor" />
    </svg>
  </button>
);

const MiniShowreel = ({
  src,
  poster,
  className = "",
}: {
  src: string;
  poster?: string;
  className?: string;
}) => {
  const thumbRef = useRef<HTMLButtonElement>(null);
  const thumbVideoRef = useRef<HTMLVideoElement>(null);
  const thumbHlsRef = useRef<Hls | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const attachedRef = useRef(false);
  const aspectRef = useRef(16 / 10);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => setMounted(true), []);

  // Thumbnail = live muted autoplay preview (eager HLS). capLevelToPlayerSize
  // houdt de kwaliteit laag want de thumbnail is klein. Klikken vergroot 'm met
  // geluid (de portal-video hieronder).
  useEffect(() => {
    const video = thumbVideoRef.current;
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({ maxBufferLength: 20, capLevelToPlayerSize: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => { /* noop */ }));
      thumbHlsRef.current = hls;
    } else {
      video.src = src;
      video.addEventListener(
        "loadedmetadata",
        () => video.play().catch(() => { /* noop */ }),
        { once: true },
      );
    }
    return () => {
      if (hls) {
        try {
          hls.destroy();
        } catch (_) {
          /* noop */
        }
      }
      thumbHlsRef.current = null;
    };
  }, [src]);

  // Attach HLS once (lazy — only when the lightbox first opens). Mirrors the
  // tuning in HlsBackgroundVideo/BunnyReelPlayer (start sharp, no low-res flash).
  const ensureHls = useCallback(() => {
    const video = videoRef.current;
    if (!video || attachedRef.current) return;
    attachedRef.current = true;
    if (Hls.isSupported()) {
      const hls = new Hls({
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
        const levels = hls.levels || [];
        if (levels.length) {
          const highestIdx = levels.reduce(
            (best, l, i) => ((l.height || 0) > (levels[best].height || 0) ? i : best),
            0,
          );
          const dpr = window.devicePixelRatio || 1;
          const renderedH = video.clientHeight || 0;
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
          hls.startLevel = idx;
        }
        hls.startLoad();
      });
      hlsRef.current = hls;
    } else {
      video.src = src; // Safari native HLS
    }
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) {
        aspectRef.current = video.videoWidth / video.videoHeight;
      }
    };
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onPause);
    video.addEventListener("loadedmetadata", onMeta);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onPause);
      video.removeEventListener("loadedmetadata", onMeta);
    };
  }, [mounted]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (_) {
          /* noop */
        }
      }
    };
  }, []);

  // Centred rect that fits the reel aspect into the viewport minus padding.
  const fitRect = () => {
    const a = aspectRef.current || 16 / 10;
    const padX = Math.min(window.innerWidth * 0.06, 80);
    const padY = Math.min(window.innerHeight * 0.1, 80);
    const bw = window.innerWidth - padX * 2;
    const bh = window.innerHeight - padY * 2;
    let w = bw;
    let h = w / a;
    if (h > bh) {
      h = bh;
      w = h * a;
    }
    return { left: padX + (bw - w) / 2, top: padY + (bh - h) / 2, width: w, height: h };
  };

  const startPlayback = () => {
    const video = videoRef.current;
    const thumb = thumbVideoRef.current;
    if (!video) return;
    ensureHls();
    hlsRef.current?.startLoad();
    // Naadloze overgang: zet de grote speler op de tijd van de live thumbnail en
    // pauzeer de thumbnail (die zit nu toch achter de uitgeklapte speler).
    if (thumb) {
      try {
        video.currentTime = thumb.currentTime;
      } catch (_) {
        /* noop */
      }
      try {
        thumb.pause();
      } catch (_) {
        /* noop */
      }
    }
    video.muted = false;
    const p = video.play();
    if (p && typeof p.then === "function") p.catch(() => { /* noop */ });
  };

  const openLightbox = () => {
    const thumb = thumbRef.current;
    const player = playerRef.current;
    const overlay = overlayRef.current;
    if (!thumb || !player || !overlay || open) return;

    const r = thumb.getBoundingClientRect();
    gsap.set(player, {
      position: "fixed",
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
      margin: 0,
      x: 0,
      y: 0,
      autoAlpha: 1,
    });
    gsap.set(thumb, { autoAlpha: 0 });

    const state = Flip.getState(player);
    const t = fitRect();
    gsap.set(player, { left: t.left, top: t.top, width: t.width, height: t.height });
    Flip.from(state, { duration: 1, ease: "expo.inOut", absolute: true });

    gsap.to(overlay, { autoAlpha: 1, duration: 1, ease: "expo.inOut" });
    setOpen(true);
    startPlayback();
  };

  const closeLightbox = useCallback(() => {
    const thumb = thumbRef.current;
    const player = playerRef.current;
    const overlay = overlayRef.current;
    const video = videoRef.current;
    if (!thumb || !player || !overlay || !open) return;

    const r = thumb.getBoundingClientRect();
    const state = Flip.getState(player);
    gsap.set(player, { left: r.left, top: r.top, width: r.width, height: r.height });
    Flip.from(state, {
      duration: 1,
      ease: "expo.inOut",
      absolute: true,
      onComplete: () => {
        gsap.set(player, { autoAlpha: 0 });
        gsap.set(thumb, { autoAlpha: 1 });
      },
    });
    gsap.to(overlay, { autoAlpha: 0, duration: 1, ease: "expo.inOut" });
    setOpen(false);

    if (video) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (_) {
        /* noop */
      }
    }
    // De live thumbnail-preview weer laten spelen.
    const thumbVid = thumbVideoRef.current;
    if (thumbVid) {
      try {
        thumbVid.play().catch(() => { /* noop */ });
      } catch (_) {
        /* noop */
      }
    }
  }, [open]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused || video.ended) startPlayback();
    else video.pause();
  };

  // Esc to close; keep the centred rect correct on resize while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
    };
    const onResize = () => {
      const t = fitRect();
      gsap.set(playerRef.current, { left: t.left, top: t.top, width: t.width, height: t.height });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, closeLightbox]);

  return (
    <>
      {/* Inline thumbnail — bare poster + glass play button. */}
      <button
        ref={thumbRef}
        type="button"
        onClick={openLightbox}
        aria-label="Open showreel"
        className={`relative block overflow-hidden ${className}`}
      >
        <video
          ref={thumbVideoRef}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          autoPlay
          playsInline
          poster={poster}
          aria-hidden
        />
        <GlassButton label="Open showreel" />
      </button>

      {/* Lightbox — portalled to <body> so it escapes the hero clipping. */}
      {mounted &&
        createPortal(
          <>
            <div
              ref={overlayRef}
              onClick={closeLightbox}
              className="invisible fixed inset-0 z-[998] bg-black/70 opacity-0"
            />
            <div
              ref={playerRef}
              className="invisible fixed left-0 top-0 z-[999] overflow-hidden rounded-[6px] opacity-0"
              style={{ width: 0, height: 0 }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full bg-black object-cover"
                playsInline
                poster={poster}
                onClick={togglePlay}
              />
              <GlassButton hidden={playing} onClick={togglePlay} label="Speel/pauzeer showreel" />
            </div>
          </>,
          document.body,
        )}
    </>
  );
};

export default MiniShowreel;
