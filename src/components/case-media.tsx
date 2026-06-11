"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Player from "@vimeo/player";
import HlsBackgroundVideo from "@/components/HlsBackgroundVideo";
import BlurImage from "@/components/BlurImage";
import SoundCursorOverlay from "@/components/SoundCursorOverlay";
import { urlFor } from "@/lib/sanity";
import { useIsMobile } from "@/hooks/use-mobile";
import { onPreloaderReveal } from "@/lib/preloader-gate";

// ---------------------------------------------------------------------------
// Shared case-media subsystem. Extracted from CaseLayout so the case detail
// pages and other pages (e.g. the press release hero) render image/video media
// through exactly the same pipeline: a muted autoplay background loop for
// videos (Vimeo background embed, HLS playlist, or direct file), with a poster
// overlay that fades on the first painted frame, plus optional mobile
// source/poster overrides.
// ---------------------------------------------------------------------------

// Normalised shape the components render. Both Sanity data and any mock map
// onto this, so the components stay source-agnostic.
export type Media = {
  type: "image" | "video";
  src: string;
  aspect?: string;
  controls?: boolean;
  lqip?: string; // base64 blur-up placeholder (image's own, or a video's poster)
  poster?: string; // resolved poster image URL, videos only
  soundToggle?: boolean; // render a mute/unmute button; the video starts muted
  // Optional mobile overrides (videos only). Each field falls back to the
  // desktop value when blank; resolveMedia() merges them under the breakpoint.
  mobile?: { src?: string; poster?: string; lqip?: string; aspect?: string };
};

// Sanity shape (the `caseHeroMedia` / `caseMedia` object, projected with the
// Vimeo meta resolved server-side — see attachVimeoMeta in sanity-fetch).
export type SanityMedia = {
  kind?: string | null;
  image?: unknown;
  lqip?: string | null; // image's LQIP blur-up
  vimeoAspect?: string | null; // "w / h" resolved server-side from Vimeo oEmbed
  vimeoId?: string | null;
  vimeoThumb?: string | null; // Vimeo oEmbed thumbnail, reused as a video poster
  videoUrl?: string | null;
  poster?: unknown;
  posterLqip?: string | null; // poster image's LQIP blur-up
  showControls?: boolean | null;
  // Optional mobile overrides (resolved server-side like their desktop twins).
  mobileVimeoId?: string | null;
  mobileVimeoAspect?: string | null;
  mobileVimeoThumb?: string | null;
  mobileVideoUrl?: string | null;
  mobilePoster?: unknown;
  mobilePosterLqip?: string | null;
};

export function toMedia(
  sm?: SanityMedia | null,
  width = 1600,
  opts: { forceNoControls?: boolean; soundToggle?: boolean } = {},
): Media | null {
  if (!sm) return null;
  if (sm.kind === "video") {
    // A Vimeo ID wins over a Bunny/MP4 source; both render as a muted autoplay
    // loop. We resolve the ID to a player URL here so CaseVideo just sees a
    // vimeo.com src and renders the iframe. `aspect` (Vimeo's real ratio) lets
    // the gallery size the video to its own shape instead of cropping it.
    //
    // `forceNoControls` overrides any `showControls=true` on the doc — used by
    // the case hero, which always plays as a silent background loop.
    // `soundToggle` builds a Vimeo embed that keeps its audio track (not the
    // chrome-less `background=1` mode, which drops audio) so the mute button
    // can unmute it; it stays muted on load.
    const controls = opts.forceNoControls ? false : !!sm.showControls;
    const vimeoOpts = { controls, sound: !!opts.soundToggle };
    const src = (sm.vimeoId && vimeoEmbedSrc(sm.vimeoId, vimeoOpts)) || sm.videoUrl;
    if (!src) return null;
    // A poster fills the box while the player loads / repaints. Prefer the
    // editor's poster (it carries a blur-up); otherwise fall back to Vimeo's
    // own thumbnail so every Vimeo video is covered without extra setup.
    const poster =
      (sm.poster
        ? urlFor(sm.poster)?.width(width).fit("max").quality(72).auto("format").url()
        : undefined) ??
      sm.vimeoThumb ??
      undefined;
    // Optional mobile overrides — a mobile-specific source and/or poster.
    // Anything left blank stays undefined and falls back to desktop at render.
    const mobileSrc =
      (sm.mobileVimeoId && vimeoEmbedSrc(sm.mobileVimeoId, vimeoOpts)) || sm.mobileVideoUrl || undefined;
    const mobilePoster =
      (sm.mobilePoster
        ? urlFor(sm.mobilePoster)?.width(width).fit("max").quality(72).auto("format").url()
        : undefined) ??
      sm.mobileVimeoThumb ??
      undefined;
    const mobile =
      mobileSrc || mobilePoster || sm.mobilePosterLqip || sm.mobileVimeoAspect
        ? {
            src: mobileSrc,
            poster: mobilePoster,
            lqip: sm.mobilePosterLqip ?? undefined,
            aspect: sm.mobileVimeoAspect ?? undefined,
          }
        : undefined;
    return {
      type: "video",
      src,
      aspect: sm.vimeoAspect ?? undefined,
      controls,
      soundToggle: !!opts.soundToggle,
      poster,
      lqip: sm.posterLqip ?? undefined,
      mobile,
    };
  }
  if (sm.image) {
    // An image object can carry alt + crop + hotspot metadata while its
    // `asset` ref is still empty (editor started filling in fields without
    // uploading a file). `urlFor` throws on that shape, which used to break
    // the whole page — bail out cleanly so the placeholder shows instead.
    const hasAsset = !!(sm.image as { asset?: unknown }).asset;
    if (!hasAsset) return null;
    // Size per slot (fit:max never upscales past the source) and let Sanity
    // pick webp/avif via auto:format, so we don't ship 2000px images into a
    // small gallery cell.
    const url = urlFor(sm.image)?.width(width).fit("max").quality(72).auto("format").url();
    if (url) return { type: "image", src: url, lqip: sm.lqip ?? undefined };
  }
  return null;
}

// Build a thumbnail Media from a work-list item's optional video thumbnail
// fields (see WORK_LIST_PROJECTION). Returns a video Media — always a silent
// autoplay loop with no controls — when a Vimeo ID or HLS URL is set, else null
// so the caller falls back to its plain <img>. `posterUrl` is the work's own
// thumbnail image, reused as the poster so the box is never empty while the
// player loads (or where the slider clones a slide outside React).
export function thumbVideoMedia(
  item: { lqip?: string | null; thumbVimeoId?: string | null; thumbVideoUrl?: string | null },
  posterUrl?: string | null,
): Media | null {
  const src =
    (item.thumbVimeoId && vimeoEmbedSrc(item.thumbVimeoId, { controls: false, sound: false })) ||
    item.thumbVideoUrl ||
    null;
  if (!src) return null;
  return {
    type: "video",
    src,
    controls: false,
    soundToggle: false,
    poster: posterUrl ?? undefined,
    lqip: item.lqip ?? undefined,
  };
}

// Merge a media's mobile overrides over its desktop values when on a small
// screen. Each mobile field falls back to desktop when blank, so an editor can
// override just the poster, just the source, or both.
export function resolveMedia(media: Media, isMobile: boolean): Media {
  const m = media.mobile;
  if (!isMobile || !m) return media;
  return {
    ...media,
    src: m.src ?? media.src,
    poster: m.poster ?? media.poster,
    lqip: m.lqip ?? media.lqip,
    aspect: m.aspect ?? media.aspect,
  };
}

// Three modes:
// - default: `background=1` — autoplay, muted, looped, no chrome, cover-fill.
// - controls: drop background mode and show Vimeo's chrome (pause/scrub/unmute).
//   Stays autoplay + muted + loop. (`background=1` and `controls` are mutually
//   exclusive.)
// - sound: chrome-less but keeps the audio track, so our own mute button can
//   unmute it. We can't use `background=1` here (it drops audio), so we use
//   `controls=0` and rely on the 16:9 hero ratio to avoid letterboxing.
export function vimeoEmbedSrc(
  input: string,
  opts: boolean | { controls?: boolean; sound?: boolean } = false,
): string | null {
  const o = typeof opts === "boolean" ? { controls: opts } : opts;
  const m = input.trim().match(/(\d{6,})(?:\/([0-9a-z]+))?/i);
  if (!m) return null;
  const [, id, hash] = m;
  const base = { autoplay: "1", muted: "1", loop: "1", autopause: "0" };
  const params = new URLSearchParams(
    o.sound
      ? { ...base, controls: "0" }
      : o.controls
        ? { ...base, controls: "1" }
        : { ...base, background: "1" },
  );
  if (hash) params.set("h", hash);
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Video — a Vimeo background embed, an HLS (.m3u8) playlist via hls.js /
// native, or a direct file. All three run as a muted autoplay loop.
// ---------------------------------------------------------------------------
function CaseVideo({
  src,
  className,
  controls = false,
  onPlaying,
  soundToggle = false,
}: {
  src: string;
  className: string;
  controls?: boolean;
  // Fires once a real frame is painted, so a poster overlay can fade without a
  // black flash. Vimeo reports it via the player API; <video>/HLS via the
  // element's first `timeupdate`.
  onPlaying?: () => void;
  // Opt-in: render a discreet mute/unmute button. The video starts muted.
  soundToggle?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [muted, setMuted] = useState(true);
  const isVimeo = src.includes("player.vimeo.com");

  // Attach the Vimeo player API to the existing iframe: fade the poster on the
  // first `timeupdate`, and keep a handle for the mute toggle when sound is on.
  useEffect(() => {
    if (!isVimeo || (!onPlaying && !soundToggle)) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const player = new Player(iframe);
    playerRef.current = player;
    let fired = false;
    const onFirstFrame = () => {
      if (fired) return;
      fired = true;
      onPlaying?.();
    };
    if (onPlaying) player.on("timeupdate", onFirstFrame);
    return () => {
      // Don't destroy(): React owns this iframe and destroy() would rip it out
      // of the DOM. Just drop our listener.
      if (onPlaying) player.off("timeupdate", onFirstFrame);
      playerRef.current = null;
    };
  }, [isVimeo, onPlaying, soundToggle, src]);

  // Don't lose the opening behind the intro preloader on a direct load: the
  // video plays muted under the overlay, and we snap it back to 0 the moment
  // the curtain lifts. On internal navigation (no preloader) this runs at once
  // and is a no-op. (HLS sources are handled inside HlsBackgroundVideo.)
  useEffect(() => {
    return onPreloaderReveal(() => {
      if (isVimeo) playerRef.current?.setCurrentTime(0).catch(() => {});
      else if (videoRef.current) videoRef.current.currentTime = 0;
    });
  }, [isVimeo, src]);

  const toggleVimeoMute = () => {
    const player = playerRef.current;
    if (!player) return;
    const next = !muted;
    setMuted(next);
    // setVolume also unmutes; the click is the user gesture autoplay needs.
    player.setVolume(next ? 0 : 1).catch(() => {});
  };
  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.muted;
    video.muted = next;
    setMuted(next);
  };

  if (isVimeo) {
    return (
      <>
        <iframe
          ref={iframeRef}
          src={src}
          className={className}
          title=""
          allow="autoplay; fullscreen; picture-in-picture"
          // Background mode: ignore clicks so overlays/links win. With controls
          // on, let pointer events through so the visitor can use the player.
          style={{ border: 0, pointerEvents: controls ? "auto" : "none" }}
        />
        {soundToggle && <SoundCursorOverlay muted={muted} onClick={toggleVimeoMute} />}
      </>
    );
  }
  const isHls = /\.m3u8(\?|#|$)/i.test(src);
  if (isHls)
    return (
      <HlsBackgroundVideo
        src={src}
        className={className}
        controls={controls}
        onPlaying={onPlaying}
        soundToggle={soundToggle}
      />
    );
  return (
    <>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className={className}
        onTimeUpdate={onPlaying ? () => onPlaying() : undefined}
      />
      {soundToggle && <SoundCursorOverlay muted={muted} onClick={toggleVideoMute} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// PosteredVideo — a video with a poster overlay covering the player on first
// load, fading once the box is in view and the player has had a beat to paint.
// (Reveals once and never re-covers — the scroll-back blank-frame issue is still
// open; see the project memory note.)
// ---------------------------------------------------------------------------
function PosteredVideo({ media, eager = false }: { media: Media; eager?: boolean }) {
  const hasPoster = !!(media.poster || media.lqip);
  const ref = useRef<HTMLDivElement>(null);
  const [covered, setCovered] = useState(true);
  const reveal = useCallback(() => setCovered(false), []);

  // Keep the poster up until the player paints a real frame (onPlaying from
  // CaseVideo), so it never crossfades to a black mid-buffer iframe. A vangnet
  // timeout — armed only once the box scrolls into view — still reveals if the
  // playback events never arrive (e.g. autoplay blocked), so the poster can't
  // get stuck on screen.
  useEffect(() => {
    if (!hasPoster) return;
    const el = ref.current;
    if (!el) return;
    let fallback: number | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fallback = window.setTimeout(reveal, 4000);
          io.disconnect();
        }
      },
      { threshold: 0.05 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [hasPoster, reveal]);

  return (
    <div ref={ref} className="absolute inset-0">
      <CaseVideo
        src={media.src}
        controls={media.controls}
        soundToggle={media.soundToggle}
        onPlaying={hasPoster ? reveal : undefined}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {hasPoster && (
        <div
          aria-hidden
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            covered ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {media.poster ? (
            <BlurImage src={media.poster} lqip={media.lqip} eager={eager} />
          ) : (
            <img
              src={media.lqip}
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MediaFill — fills a positioned media box. Images blur-up; videos get a
// postered player (see PosteredVideo).
// ---------------------------------------------------------------------------
export function MediaFill({ media, eager = false }: { media: Media; eager?: boolean }) {
  if (media.type === "image") {
    return <BlurImage src={media.src} lqip={media.lqip} eager={eager} />;
  }
  return <PosteredVideo media={media} eager={eager} />;
}

// ---------------------------------------------------------------------------
// HeroMedia — full-bleed image or video hero. Defaults to a 16:9 box (like the
// case hero); pass `className` to override the framing. Resolves mobile
// overrides under the breakpoint.
// ---------------------------------------------------------------------------
export function HeroMedia({
  media,
  className = "relative aspect-[16/9] w-full overflow-hidden",
}: {
  media: Media;
  className?: string;
}) {
  const isMobile = useIsMobile();
  return (
    <section className={className} style={{ background: "var(--media-placeholder)" }}>
      <MediaFill media={resolveMedia(media, isMobile)} eager />
    </section>
  );
}
