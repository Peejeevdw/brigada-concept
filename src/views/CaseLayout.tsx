"use client";

import { Fragment, useState } from "react";
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
type Media = { type: "image" | "video"; src: string };
type Section = { id: string; title: string; body: string[] };
type ProjectInfo = { sections: Section[]; services: string[] };
export type CaseData = {
  hero: Media | null;
  title: string;
  client: string;
  projectInfo: ProjectInfo;
  gallery: Media[][]; // each inner array is one row of 1–3 visuals
};

// ---------------------------------------------------------------------------
// Sanity shape (from getWorkLayout / WORK_FULL_PROJECTION) + mapping.
// ---------------------------------------------------------------------------
type SanityMedia = {
  kind?: string | null;
  image?: unknown;
  videoUrl?: string | null;
  poster?: unknown;
};
export type WorkLayoutData = {
  name?: string | null;
  client?: string | null;
  hero?: SanityMedia | null;
  projectInfo?: {
    sections?: ({ heading?: string | null; body?: string | null } | null)[] | null;
    services?: (string | null)[] | null;
  } | null;
  mediaRows?: ({ items?: (SanityMedia | null)[] | null } | null)[] | null;
};

function toMedia(sm?: SanityMedia | null): Media | null {
  if (!sm) return null;
  if (sm.kind === "video") {
    return sm.videoUrl ? { type: "video", src: sm.videoUrl } : null;
  }
  if (sm.image) {
    const url = urlFor(sm.image)?.width(2000).auto("format").url();
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

  const gallery: Media[][] = (data.mediaRows ?? [])
    .map((row) =>
      (row?.items ?? []).map(toMedia).filter((m): m is Media => m !== null),
    )
    .filter((r) => r.length > 0);

  const hero = toMedia(data.hero);

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

// ---------------------------------------------------------------------------
// Video — plays HLS (.m3u8) via hls.js / native, or a direct file otherwise.
// ---------------------------------------------------------------------------
function CaseVideo({ src, className }: { src: string; className: string }) {
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
    <section className="relative h-[78vh] w-full overflow-hidden">
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
      className={`relative flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between md:gap-10 ${GUTTER}`}
    >
      {/* H2 styled like the Brand page's SectionLabel. */}
      <h2
        className="max-w-[40ch] text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
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
          className="font-nav inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-current px-5 py-2 text-sm transition-colors hover:bg-[#181614] hover:text-white md:self-auto"
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
function GalleryMedia({ media, aspect }: { media: Media; aspect: string }) {
  return (
    <div className={`relative w-full overflow-hidden ${aspect}`}>
      {media.type === "video" ? (
        <CaseVideo src={media.src} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <img
          src={media.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function CaseGallery({ rows }: { rows: Media[][] }) {
  return (
    <div className={`flex flex-col gap-3 pb-24 md:gap-5 ${GUTTER}`}>
      {rows.map((items, i) => {
        if (items.length === 1) {
          return <GalleryMedia key={i} media={items[0]} aspect="aspect-[16/9]" />;
        }
        const cols = items.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
        return (
          <div key={i} className={`grid grid-cols-1 gap-3 ${cols} md:gap-5`}>
            {items.map((m, j) => (
              <GalleryMedia key={j} media={m} aspect="aspect-[3/4]" />
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

  return (
    <main style={{ background: PAGE_BG, color: INK }}>
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
