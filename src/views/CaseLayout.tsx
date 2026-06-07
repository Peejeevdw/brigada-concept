"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Drawer } from "vaul";
import Player from "@vimeo/player";
import SiteNav from "@/components/site/SiteNav";
import HlsBackgroundVideo from "@/components/HlsBackgroundVideo";
import CascadingSlider, { type CascadingSlide } from "@/components/CascadingSlider";
import BrandFooter from "@/components/BrandFooter";
import BlurImage from "@/components/BlurImage";
import { SANS } from "@/lib/siteTokens";
import { urlFor } from "@/lib/sanity";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// ---------------------------------------------------------------------------
// Normalised shape the layout renders. Both Sanity data and the mock map onto
// this, so the components below stay source-agnostic.
// ---------------------------------------------------------------------------
type Media = {
  type: "image" | "video";
  src: string;
  aspect?: string;
  controls?: boolean;
  lqip?: string; // base64 blur-up placeholder (image's own, or a video's poster)
  poster?: string; // resolved poster image URL, videos only
  // Optional mobile overrides (videos only). Each field falls back to the
  // desktop value when blank; resolveMedia() merges them under the breakpoint.
  mobile?: { src?: string; poster?: string; lqip?: string; aspect?: string };
};
type GalleryRow = { items: Media[]; fullBleed: boolean }; // 1–3 visuals, optionally edge to edge
type Section = { id: string; title: string; body: string[] };
type ProjectInfo = { sections: Section[]; services: string[] };
export type CaseData = {
  hero: Media | null;
  title: string;
  client: string;
  projectInfo: ProjectInfo;
  gallery: GalleryRow[];
};

// ---------------------------------------------------------------------------
// Sanity shape (from getWorkLayout / WORK_FULL_PROJECTION) + mapping.
// ---------------------------------------------------------------------------
type SanityMedia = {
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
export type WorkLayoutData = {
  name?: string | null;
  client?: string | null;
  darkMode?: boolean | null;
  hero?: SanityMedia | null;
  projectInfo?: {
    sections?: ({ heading?: string | null; body?: string | null } | null)[] | null;
    services?: (string | null)[] | null;
  } | null;
  mediaRows?: ({ items?: (SanityMedia | null)[] | null; fullBleed?: boolean | null } | null)[] | null;
  // Other cases with a thumbnail, for the "Related cases" slider (WORK_LIST_PROJECTION).
  relatedCases?: ({ _id?: string; name?: string | null; slug?: string | null; image?: unknown; lqip?: string | null } | null)[] | null;
};

function toMedia(sm?: SanityMedia | null, width = 1600): Media | null {
  if (!sm) return null;
  if (sm.kind === "video") {
    // A Vimeo ID wins over a Bunny/MP4 source; both render as a muted autoplay
    // loop. We resolve the ID to a player URL here so CaseVideo just sees a
    // vimeo.com src and renders the iframe. `aspect` (Vimeo's real ratio) lets
    // the gallery size the video to its own shape instead of cropping it.
    const controls = !!sm.showControls;
    const src = (sm.vimeoId && vimeoEmbedSrc(sm.vimeoId, controls)) || sm.videoUrl;
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
      (sm.mobileVimeoId && vimeoEmbedSrc(sm.mobileVimeoId, controls)) || sm.mobileVideoUrl || undefined;
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
      poster,
      lqip: sm.posterLqip ?? undefined,
      mobile,
    };
  }
  if (sm.image) {
    // Size per slot (fit:max never upscales past the source) and let Sanity
    // pick webp/avif via auto:format, so we don't ship 2000px images into a
    // small gallery cell.
    const url = urlFor(sm.image)?.width(width).fit("max").quality(72).auto("format").url();
    if (url) return { type: "image", src: url, lqip: sm.lqip ?? undefined };
  }
  return null;
}

// Merge a media's mobile overrides over its desktop values when on a small
// screen. Each mobile field falls back to desktop when blank, so an editor can
// override just the poster, just the source, or both.
function resolveMedia(media: Media, isMobile: boolean): Media {
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

export function fromSanity(data: WorkLayoutData | null): CaseData | null {
  if (!data) return null;

  const sections: Section[] = (data.projectInfo?.sections ?? [])
    .map((s, i) => ({
      id: `${(s?.heading ?? "section").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`,
      title: s?.heading ?? "",
      body: (s?.body ?? "")
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.title);

  const gallery: GalleryRow[] = (data.mediaRows ?? [])
    .map((row) => {
      const items = row?.items ?? [];
      const fullBleed = !!row?.fullBleed;
      // Request a width that matches how wide the cell actually renders; bump it
      // for full-bleed rows since they span the whole viewport.
      const base = items.length >= 3 ? 760 : items.length === 2 ? 1040 : 1600;
      const width = fullBleed ? Math.max(base, 2400) : base;
      const media = items
        .map((m) => toMedia(m, width))
        .filter((m): m is Media => m !== null);
      return { items: media, fullBleed };
    })
    .filter((r) => r.items.length > 0);

  const hero = toMedia(data.hero, 1920);

  // Nothing meaningful filled in yet.
  if (!hero && sections.length === 0 && gallery.length === 0) return null;

  return {
    hero,
    title: data.name ?? "",
    client: data.client ?? "",
    projectInfo: {
      sections,
      services: (data.projectInfo?.services ?? []).filter(
        (s): s is string => typeof s === "string" && s.length > 0,
      ),
    },
    gallery,
  };
}

const INK = "#181614";
const PAGE_BG = "#f3f2ef";
// Same gutters as the Brand page (full width, no centred max-width).
const GUTTER = "px-[clamp(24px,5vw,72px)]";
// Cancels the gutter so a row runs edge to edge — must mirror GUTTER's value.
const BLEED = "-mx-[clamp(24px,5vw,72px)]";

// Page palette. `line` is the hairline used for drawer borders/dividers; text
// faintness elsewhere is plain currentColor opacity, so it works in both modes.
type Theme = { bg: string; fg: string; line: string; placeholder: string };
const THEME: Record<"light" | "dark", Theme> = {
  // `placeholder` fills a media box before its image/video paints, so empty
  // slots read as "loading" rather than as a gap in the page.
  light: { bg: PAGE_BG, fg: INK, line: "rgba(0,0,0,0.1)", placeholder: "#e7e6e1" },
  dark: { bg: "#000000", fg: "#ffffff", line: "rgba(255,255,255,0.18)", placeholder: "#191919" },
};

// Turn a Vimeo ID into a player embed URL. Accepts a bare ID ("123456789"), an
// unlisted "ID/HASH", or a full Vimeo URL pasted in.
//
// Default (controls=false): `background=1` — autoplay, muted, looped, no chrome,
// and Vimeo cover-fills its own iframe, so the embed behaves exactly like the
// muted <video> elements next to it.
//
// controls=true: drop background mode and show Vimeo's controls. We keep
// autoplay + muted + loop so it still plays on load, but the visitor can pause,
// scrub and unmute. (`background=1` and `controls` are mutually exclusive.)
function vimeoEmbedSrc(input: string, controls = false): string | null {
  const m = input.trim().match(/(\d{6,})(?:\/([0-9a-z]+))?/i);
  if (!m) return null;
  const [, id, hash] = m;
  const params = new URLSearchParams(
    controls
      ? {autoplay: "1", muted: "1", loop: "1", autopause: "0", controls: "1"}
      : {background: "1", autoplay: "1", muted: "1", loop: "1", autopause: "0"},
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
}: {
  src: string;
  className: string;
  controls?: boolean;
  // Fires once a real frame is painted, so a poster overlay can fade without a
  // black flash. Vimeo reports it via the player API; <video>/HLS via the
  // element's first `timeupdate`.
  onPlaying?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isVimeo = src.includes("player.vimeo.com");

  // Attach the Vimeo player API to the existing iframe and fade the poster on
  // the first `timeupdate` (= playback actually advanced → a frame is up).
  useEffect(() => {
    if (!isVimeo || !onPlaying) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    const player = new Player(iframe);
    let fired = false;
    const onFirstFrame = () => {
      if (fired) return;
      fired = true;
      onPlaying();
    };
    player.on("timeupdate", onFirstFrame);
    return () => {
      // Don't destroy(): React owns this iframe and destroy() would rip it out
      // of the DOM. Just drop our listener.
      player.off("timeupdate", onFirstFrame);
    };
  }, [isVimeo, onPlaying, src]);

  if (isVimeo) {
    return (
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
    );
  }
  const isHls = /\.m3u8(\?|#|$)/i.test(src);
  if (isHls) return <HlsBackgroundVideo src={src} className={className} onPlaying={onPlaying} />;
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className={className}
      onTimeUpdate={onPlaying ? () => onPlaying() : undefined}
    />
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
function MediaFill({ media, eager = false }: { media: Media; eager?: boolean }) {
  if (media.type === "image") {
    return <BlurImage src={media.src} lqip={media.lqip} eager={eager} />;
  }
  return <PosteredVideo media={media} eager={eager} />;
}

// ---------------------------------------------------------------------------
// Hero — full-bleed image or video.
// ---------------------------------------------------------------------------
function CaseHero({ media }: { media: Media }) {
  const isMobile = useIsMobile();
  return (
    <section
      className="relative aspect-[16/9] w-full overflow-hidden"
      style={{ background: "var(--media-placeholder)" }}
    >
      <MediaFill media={resolveMedia(media, isMobile)} eager />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Title bar — case title (left) · client (middle) · "Project info" (right).
// ---------------------------------------------------------------------------
function CaseTitleBar({
  title,
  client,
  onOpenInfo,
}: {
  title: string;
  client: string;
  onOpenInfo: () => void;
}) {
  return (
    <div
      className={`relative flex flex-col gap-6 py-12 md:flex-row md:items-center md:justify-between md:gap-10 md:py-16 ${GUTTER}`}
    >
      {/* H2 styled like the Brand page's SectionLabel. */}
      <h2
        className="max-w-[28ch] text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
        style={{ fontFamily: SANS, fontWeight: 500 }}
      >
        {title}
      </h2>

      {/* Client — centered across the bar on desktop; in flow on mobile. */}
      {client && (
        <p className="font-nav text-sm md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
          <span className="opacity-50">Client</span>&nbsp;&nbsp;{client}
        </p>
      )}

      <Drawer.Trigger asChild>
        <button
          type="button"
          onClick={onOpenInfo}
          className="font-nav inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-current px-5 py-2 text-sm transition-colors hover:bg-[var(--fg)] hover:text-[var(--bg)] md:self-auto"
        >
          Project info
          <span aria-hidden className="text-xs leading-none opacity-70">
            +
          </span>
        </button>
      </Drawer.Trigger>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery — rows of 1–3 visuals; item count sets the layout.
// ---------------------------------------------------------------------------
function GalleryMedia({
  media,
  aspectClass,
  aspectRatio,
}: {
  media: Media;
  aspectClass?: string;
  aspectRatio?: string; // inline CSS aspect-ratio, e.g. "1 / 1" (wins over the class)
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${aspectClass ?? ""}`}
      style={{ aspectRatio: aspectRatio || undefined, background: "var(--media-placeholder)" }}
    >
      <MediaFill media={media} />
    </div>
  );
}

function CaseGallery({ rows }: { rows: GalleryRow[] }) {
  const isMobile = useIsMobile();
  return (
    <div className={`flex flex-col gap-3 pb-24 md:gap-5 ${GUTTER}`}>
      {rows.map((row, i) => {
        const { fullBleed } = row;
        // Resolve each item to its mobile variant (if any) before deciding the
        // layout, so the box aspect and the painted source stay in sync.
        const items = row.items.map((m) => resolveMedia(m, isMobile));
        const bleed = fullBleed ? BLEED : "";
        if (items.length === 1) {
          const m = items[0];
          // A solo video shows at its own ratio (full available width); images
          // and ratio-less videos keep the 16:9 frame.
          return (
            <div key={i} className={bleed}>
              {m.type === "video" && m.aspect ? (
                <GalleryMedia media={m} aspectRatio={m.aspect} />
              ) : (
                <GalleryMedia media={m} aspectClass="aspect-[16/9]" />
              )}
            </div>
          );
        }
        const cols = items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
        return (
          <div key={i} className={`grid grid-cols-1 gap-3 ${cols} md:gap-5 ${bleed}`}>
            {items.map((m, j) => (
              <GalleryMedia key={j} media={m} aspectClass="aspect-[3/4]" />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project info — right-side drawer (vaul).
// ---------------------------------------------------------------------------
function ProjectInfoDrawer({ info, title }: { info: ProjectInfo; title: string }) {
  // Always white, regardless of the page's dark mode.
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <Drawer.Content
        className="fixed inset-y-0 right-0 z-50 flex w-[440px] max-w-[92vw] flex-col bg-white outline-none"
        style={{ color: INK }}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-8 py-6">
          <Drawer.Title className="font-nav text-sm uppercase tracking-wide">
            Project info
          </Drawer.Title>
          <Drawer.Close
            className="font-nav text-sm opacity-60 transition-opacity hover:opacity-100"
            aria-label="Close"
          >
            ✕
          </Drawer.Close>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-8">
          <Drawer.Description className="sr-only">
            Details for {title}
          </Drawer.Description>

          <h2
            className="text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
            style={{ fontFamily: SANS, fontWeight: 500 }}
          >
            {title}
          </h2>

          <Accordion
            type="multiple"
            defaultValue={info.sections[0] ? [info.sections[0].id] : []}
            className="mt-8"
          >
            {info.sections.map((s) => (
              <AccordionItem
                key={s.id}
                value={s.id}
                className="border-b border-black/10"
              >
                <AccordionTrigger className="font-nav text-sm uppercase tracking-wide hover:no-underline">
                  {s.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div
                    className="flex flex-col gap-4 pb-2 text-[clamp(13px,1.05vw,15px)] leading-[1.6] opacity-50"
                    style={{ fontFamily: SANS }}
                  >
                    {s.body.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {info.services.length > 0 && (
            <>
              <h3 className="font-nav mt-10 text-xs uppercase tracking-wide opacity-50">
                Services involved
              </h3>
              <div
                className="mt-2 flex flex-wrap items-center gap-3 text-sm"
                style={{ fontFamily: SANS }}
              >
                {info.services.map((s, i) => (
                  <Fragment key={s}>
                    {i > 0 && <span className="h-3 w-px bg-black/10" aria-hidden />}
                    <span>{s}</span>
                  </Fragment>
                ))}
              </div>
            </>
          )}
        </div>
      </Drawer.Content>
    </Drawer.Portal>
  );
}

// ---------------------------------------------------------------------------
// CaseLayout — renders the full new-style case page from Sanity data.
// `mockFallback` lets the /work-lab prototype show built-in content while no
// case has the new fields filled in; the real detail page leaves it off.
// ---------------------------------------------------------------------------
export default function CaseLayout({
  data,
  mockFallback = false,
  mock,
}: {
  data: WorkLayoutData | null;
  mockFallback?: boolean;
  mock?: CaseData;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  // Related cases → slider slides. Memoised so toggling the drawer doesn't
  // hand CascadingSlider a new array and force it to re-init.
  const relatedSlides = useMemo<CascadingSlide[]>(
    () =>
      (data?.relatedCases ?? [])
        .map((rc): CascadingSlide | null => {
          if (!rc?.image) return null;
          const img = urlFor(rc.image)?.width(900).fit("max").quality(72).auto("format").url();
          if (!img) return null;
          return {
            img,
            title: rc.name ?? "",
            href: rc.slug ? `/work/${rc.slug}` : undefined,
            lqip: rc.lqip ?? undefined,
          };
        })
        .filter((s): s is CascadingSlide => s !== null),
    [data?.relatedCases],
  );
  const c = fromSanity(data) ?? (mockFallback ? mock ?? null : null);
  if (!c) return null;

  const theme = data?.darkMode ? THEME.dark : THEME.light;
  // TEST: the related-cases section uses the *opposite* theme so it reads as a
  // distinct band off the case (dark under a light case, light under a dark one).
  const relatedTheme = data?.darkMode ? THEME.light : THEME.dark;
  // --fg/--bg cascade to in-page elements (e.g. the title-bar button hover).
  const pageStyle = {
    background: theme.bg,
    color: theme.fg,
    "--fg": theme.fg,
    "--bg": theme.bg,
    "--media-placeholder": theme.placeholder,
  } as CSSProperties;

  return (
    <main style={pageStyle}>
      <Drawer.Root
        direction="right"
        open={infoOpen}
        onOpenChange={setInfoOpen}
        shouldScaleBackground={false}
      >
        <SiteNav textClassName={data?.darkMode ? "text-white" : "text-brigada-black"} />
        {c.hero && <CaseHero media={c.hero} />}
        <CaseTitleBar
          title={c.title}
          client={c.client}
          onOpenInfo={() => setInfoOpen(true)}
        />
        {c.gallery.length > 0 && <CaseGallery rows={c.gallery} />}

        {relatedSlides.length > 0 && (
          <section
            className={`pt-[clamp(48px,7vw,110px)] pb-[clamp(80px,12vw,180px)] ${GUTTER}`}
            style={{ background: relatedTheme.bg, color: relatedTheme.fg }}
          >
            <div>
              <h2
                className="text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
                style={{ fontFamily: SANS, fontWeight: 500 }}
              >
                Related cases
              </h2>
            </div>
            {/* Override the slider's global max-width: 90em cap so it fills the
                full gutter content width, matching the gallery/title above. */}
            <div className="mt-[clamp(48px,7vw,110px)] [&_.cascading-slider]:max-w-none">
              <CascadingSlider slides={relatedSlides} ariaLabel="Related cases" />
            </div>
          </section>
        )}

        {/* TEST: always show the /brand footer (brio-06 + meetmarcel backdrop)
            on case detail. Previous (contrast) behaviour was:
            {data?.darkMode ? <BrandFooter light /> : <BrandFooter dark />} */}
        <BrandFooter brioPaletteId="brio-06" brioSrc={`/meetmarcel.jpg`} />

        <ProjectInfoDrawer info={c.projectInfo} title={c.title} />
      </Drawer.Root>
    </main>
  );
}
