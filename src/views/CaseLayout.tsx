"use client";

import { Fragment, useState, type CSSProperties } from "react";
import { Drawer } from "vaul";
import SiteNav from "@/components/site/SiteNav";
import HlsBackgroundVideo from "@/components/HlsBackgroundVideo";
import { SANS } from "@/lib/siteTokens";
import { urlFor } from "@/lib/sanity";
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
type Media = { type: "image" | "video"; src: string; aspect?: string };
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
  vimeoId?: string | null;
  vimeoAspect?: string | null; // "w / h" resolved server-side from Vimeo oEmbed
  videoUrl?: string | null;
  poster?: unknown;
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
};

function toMedia(sm?: SanityMedia | null, width = 1600): Media | null {
  if (!sm) return null;
  if (sm.kind === "video") {
    // A Vimeo ID wins over a Bunny/MP4 source; both render as a muted autoplay
    // loop. We resolve the ID to a player URL here so CaseVideo just sees a
    // vimeo.com src and renders the iframe. `aspect` (Vimeo's real ratio) lets
    // the gallery size the video to its own shape instead of cropping it.
    const src = (sm.vimeoId && vimeoEmbedSrc(sm.vimeoId)) || sm.videoUrl;
    return src ? { type: "video", src, aspect: sm.vimeoAspect ?? undefined } : null;
  }
  if (sm.image) {
    // Size per slot (fit:max never upscales past the source) and let Sanity
    // pick webp/avif via auto:format, so we don't ship 2000px images into a
    // small gallery cell.
    const url = urlFor(sm.image)?.width(width).fit("max").quality(72).auto("format").url();
    if (url) return { type: "image", src: url };
  }
  return null;
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
type Theme = { bg: string; fg: string; line: string };
const THEME: Record<"light" | "dark", Theme> = {
  light: { bg: PAGE_BG, fg: INK, line: "rgba(0,0,0,0.1)" },
  dark: { bg: "#000000", fg: "#ffffff", line: "rgba(255,255,255,0.18)" },
};

// Turn a Vimeo ID into a background-player embed URL (autoplay, muted, looped,
// no chrome — Vimeo's `background=1` also cover-fills its own iframe, so the
// embed behaves exactly like the muted <video> elements next to it). Accepts a
// bare ID ("123456789"), an unlisted "ID/HASH", or a full Vimeo URL pasted in.
function vimeoEmbedSrc(input: string): string | null {
  const m = input.trim().match(/(\d{6,})(?:\/([0-9a-z]+))?/i);
  if (!m) return null;
  const [, id, hash] = m;
  const params = new URLSearchParams({
    background: "1",
    autoplay: "1",
    muted: "1",
    loop: "1",
    autopause: "0",
  });
  if (hash) params.set("h", hash);
  return `https://player.vimeo.com/video/${id}?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Video — a Vimeo background embed, an HLS (.m3u8) playlist via hls.js /
// native, or a direct file. All three run as a muted autoplay loop.
// ---------------------------------------------------------------------------
function CaseVideo({ src, className }: { src: string; className: string }) {
  if (src.includes("player.vimeo.com")) {
    return (
      <iframe
        src={src}
        className={className}
        title=""
        allow="autoplay; fullscreen; picture-in-picture"
        // No controls in background mode; ignore clicks so overlays/links win.
        style={{ border: 0, pointerEvents: "none" }}
      />
    );
  }
  const isHls = /\.m3u8(\?|#|$)/i.test(src);
  if (isHls) return <HlsBackgroundVideo src={src} className={className} />;
  return (
    <video
      src={src}
      autoPlay
      muted
      loop
      playsInline
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Hero — full-bleed image or video.
// ---------------------------------------------------------------------------
function CaseHero({ media }: { media: Media }) {
  return (
    <section className="relative aspect-[16/9] w-full overflow-hidden">
      {media.type === "video" ? (
        <CaseVideo src={media.src} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img
          src={media.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
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
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {media.type === "video" ? (
        <CaseVideo src={media.src} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img
          src={media.src}
          alt=""
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function CaseGallery({ rows }: { rows: GalleryRow[] }) {
  return (
    <div className={`flex flex-col gap-3 pb-24 md:gap-5 ${GUTTER}`}>
      {rows.map((row, i) => {
        const { items, fullBleed } = row;
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
  const c = fromSanity(data) ?? (mockFallback ? mock ?? null : null);
  if (!c) return null;

  const theme = data?.darkMode ? THEME.dark : THEME.light;
  // --fg/--bg cascade to in-page elements (e.g. the title-bar button hover).
  const pageStyle = {
    background: theme.bg,
    color: theme.fg,
    "--fg": theme.fg,
    "--bg": theme.bg,
  } as CSSProperties;

  return (
    <main style={pageStyle}>
      <Drawer.Root
        direction="right"
        open={infoOpen}
        onOpenChange={setInfoOpen}
        shouldScaleBackground={false}
      >
        <SiteNav />
        {c.hero && <CaseHero media={c.hero} />}
        <CaseTitleBar
          title={c.title}
          client={c.client}
          onOpenInfo={() => setInfoOpen(true)}
        />
        {c.gallery.length > 0 && <CaseGallery rows={c.gallery} />}

        <ProjectInfoDrawer info={c.projectInfo} title={c.title} />
      </Drawer.Root>
    </main>
  );
}
