"use client";

import {
  Fragment,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Drawer } from "vaul";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import SiteNav from "@/components/site/SiteNav";
import CascadingSlider, { type CascadingSlide } from "@/components/CascadingSlider";
import BrandFooter from "@/components/BrandFooter";
import {
  type Media,
  type SanityMedia,
  toMedia,
  resolveMedia,
  MediaFill,
  HeroMedia,
  thumbVideoMedia,
} from "@/components/case-media";
import { SANS } from "@/lib/siteTokens";
import { urlFor } from "@/lib/sanity";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCanvasColor } from "@/hooks/useCanvasColor";
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
// `split` only matters for 2-item rows: "even" (50/50), "one-two" (1/3 + 2/3)
// or "two-one" (2/3 + 1/3).
type RowSplit = "even" | "one-two" | "two-one";
type GalleryRow = { items: Media[]; fullBleed: boolean; split?: RowSplit }; // 1–3 visuals, optionally edge to edge
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
export type WorkLayoutData = {
  name?: string | null;
  client?: string | null;
  darkMode?: boolean | null;
  hero?: SanityMedia | null;
  projectInfo?: {
    sections?: ({ heading?: string | null; body?: string | null } | null)[] | null;
    services?: (string | null)[] | null;
  } | null;
  mediaRows?: ({ items?: (SanityMedia | null)[] | null; fullBleed?: boolean | null; split?: string | null } | null)[] | null;
  // Other cases with a thumbnail, for the "Related cases" slider (WORK_LIST_PROJECTION).
  relatedCases?: ({ _id?: string; name?: string | null; slug?: string | null; image?: unknown; lqip?: string | null; thumbVimeoId?: string | null; thumbVideoUrl?: string | null } | null)[] | null;
};

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
      const split: RowSplit =
        items.length === 2 && (row?.split === "one-two" || row?.split === "two-one")
          ? row.split
          : "even";
      // Request a width that matches how wide the cell actually renders; bump it
      // for full-bleed rows since they span the whole viewport. A split row has a
      // 2/3-wide cell, so ask for more pixels than the even two-up.
      const base = items.length >= 3 ? 760 : items.length === 2 ? (split === "even" ? 1040 : 1400) : 1600;
      const width = fullBleed ? Math.max(base, 2400) : base;
      const media = items
        .map((m) => toMedia(m, width))
        .filter((m): m is Media => m !== null);
      return { items: media, fullBleed, split };
    })
    .filter((r) => r.items.length > 0);

  // Hero defaults to a silent background loop, but honours the doc's
  // `showControls` toggle so an editor can opt into a playable hero (Vimeo or
  // Bunny HLS). Also request a large Sanity image for the hero poster so it
  // lands sharp on retina hero-sized screens (LCP candidate).
  const hero = toMedia(data.hero, 3840);

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
// Cancels the gallery's side padding so a fullBleed row runs edge to edge —
// must mirror the gallery's px-3/md:px-5 (which matches the inter-row gap).
const BLEED = "-mx-3 md:-mx-5";

// Page palette. `line` is the hairline used for drawer borders/dividers; text
// faintness elsewhere is plain currentColor opacity, so it works in both modes.
type Theme = { bg: string; fg: string; line: string; placeholder: string };
const THEME: Record<"light" | "dark", Theme> = {
  // `placeholder` fills a media box before its image/video paints, so empty
  // slots read as "loading" rather than as a gap in the page.
  light: { bg: PAGE_BG, fg: INK, line: "rgba(0,0,0,0.1)", placeholder: "#e7e6e1" },
  dark: { bg: "#000000", fg: "#ffffff", line: "rgba(255,255,255,0.18)", placeholder: "#191919" },
};

// ---------------------------------------------------------------------------
// Title bar — case title (left) · client (middle) · "Project info" (right).
// ---------------------------------------------------------------------------
function CaseTitleBar({
  title,
  client,
}: {
  title: string;
  client: string;
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

      {/* Client — right-aligned on desktop, in flow on mobile. */}
      {client && (
        <p className="font-nav text-sm md:text-right">
          <span className="opacity-50">Client</span>&nbsp;&nbsp;{client}
        </p>
      )}
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
  // Side padding equals the inter-row/column gap (gap-3 / md:gap-5) so the
  // margins around the gallery match the spacing between the media.
  return (
    <div className="flex flex-col gap-3 pb-24 md:gap-5 px-3 md:px-5">
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
        // A 2-item row can be weighted 1/3 + 2/3 (or the reverse). On desktop the
        // row gets a fixed aspect and the cells stretch to fill it (so the narrow
        // and wide cell share one height); on mobile both splits collapse to the
        // same stacked column as an even row.
        if (items.length === 2 && (row.split === "one-two" || row.split === "two-one")) {
          const colClass =
            row.split === "one-two"
              ? "md:[grid-template-columns:1fr_2fr]"
              : "md:[grid-template-columns:2fr_1fr]";
          return (
            <div key={i} className={`grid grid-cols-1 gap-3 md:gap-5 md:aspect-[3/2] ${colClass} ${bleed}`}>
              {items.map((m, j) => (
                <GalleryMedia key={j} media={m} aspectClass="aspect-[3/4] md:aspect-auto md:h-full" />
              ))}
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
// Project info — inline variant. Same data as the drawer, but laid out as
// spec tables near the bottom of the case so it's visible without opening the
// panel. The drawer stays in place; this is additive.
// ---------------------------------------------------------------------------
function CaseInfoBlock({
  info,
  client,
  theme,
}: {
  info: ProjectInfo;
  client: string;
  theme: Theme;
}) {
  if (info.sections.length === 0 && info.services.length === 0 && !client) {
    return null;
  }

  // Each spec row: label (left) · value (right). A hairline divides rows so the
  // block reads as a clean table in both light and dark mode.
  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: ReactNode;
  }) => (
    <div
      className="grid grid-cols-1 gap-2 border-t py-6 md:grid-cols-[minmax(160px,260px)_1fr] md:gap-10"
      style={{ borderColor: theme.line }}
    >
      <dt className="font-nav text-xs uppercase tracking-wide opacity-50">
        {label}
      </dt>
      <dd
        className="text-[clamp(14px,1.1vw,16px)] leading-[1.6]"
        style={{ fontFamily: SANS }}
      >
        {children}
      </dd>
    </div>
  );

  return (
    <section className={`pb-24 ${GUTTER}`}>
      <dl
        className="border-b"
        style={{ borderColor: theme.line }}
      >
        {client && <Row label="Client">{client}</Row>}

        {info.sections.map((s) => (
          <Row key={s.id} label={s.title}>
            <div className="flex flex-col gap-4">
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Row>
        ))}

        {info.services.length > 0 && (
          <Row label="Services">
            <div className="flex flex-wrap items-center gap-3">
              {info.services.map((s, i) => (
                <Fragment key={s}>
                  {i > 0 && (
                    <span
                      className="h-3 w-px"
                      style={{ background: theme.line }}
                      aria-hidden
                    />
                  )}
                  <span>{s}</span>
                </Fragment>
              ))}
            </div>
          </Row>
        )}
      </dl>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Project info — tabs variant. Each section becomes a tab and its body shows in
// a panel below; services get their own tab at the end. Sits right under the
// title bar. Client lives in the title bar, so it's not repeated here.
// ---------------------------------------------------------------------------
const SERVICES_TAB = "__services";

function CaseInfoTabs({ info, theme }: { info: ProjectInfo; theme: Theme }) {
  const hasServices = info.services.length > 0;

  // One flat list of tabs (sections + an optional services tab) so the bar and
  // the indicator math stay simple.
  const tabs = useMemo(
    () => [
      ...info.sections.map((s) => ({ id: s.id, label: s.title })),
      ...(hasServices ? [{ id: SERVICES_TAB, label: "Services" }] : []),
    ],
    [info.sections, hasServices],
  );

  const [active, setActive] = useState(tabs[0]?.id ?? SERVICES_TAB);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // The sliding underline: position + width measured from the active trigger,
  // then animated via a CSS transition on the span below.
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // Measure the active trigger relative to the (scrolling) list, so the
  // indicator lines up and scrolls along with the tabs. Re-run on resize and
  // whenever the active tab or the tab set changes.
  useLayoutEffect(() => {
    const measure = () => {
      const el = triggerRefs.current[active];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, tabs]);

  if (tabs.length === 0) return null;

  return (
    <section className={`pb-24 ${GUTTER}`}>
      <TabsPrimitive.Root value={active} onValueChange={setActive}>
        {/* Tab bar — single row, horizontally scrollable on narrow screens
            (scrollbar hidden). The indicator lives inside so it scrolls along. */}
        <TabsPrimitive.List
          ref={listRef}
          className="relative flex flex-nowrap gap-x-8 overflow-x-auto border-b [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ borderColor: theme.line }}
        >
          {tabs.map((t) => (
            <TabsPrimitive.Trigger
              key={t.id}
              value={t.id}
              ref={(el) => {
                triggerRefs.current[t.id] = el;
              }}
              className="font-nav shrink-0 whitespace-nowrap py-3 text-xs uppercase tracking-wide opacity-50 transition-opacity hover:opacity-100 data-[state=active]:opacity-100"
            >
              {t.label}
            </TabsPrimitive.Trigger>
          ))}

          {/* The single sliding underline. */}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-current transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
            style={{
              width: indicator.width,
              transform: `translateX(${indicator.left}px)`,
            }}
          />
        </TabsPrimitive.List>

        {info.sections.map((s) => (
          <TabsPrimitive.Content
            key={s.id}
            value={s.id}
            className="pt-8 focus-visible:outline-none"
          >
            <div
              className="flex max-w-[68ch] flex-col gap-4 text-[clamp(14px,1.1vw,16px)] leading-[1.6] md:text-[18px] md:leading-[2.1]"
              style={{ fontFamily: SANS }}
            >
              {s.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </TabsPrimitive.Content>
        ))}

        {hasServices && (
          <TabsPrimitive.Content
            value={SERVICES_TAB}
            className="pt-8 focus-visible:outline-none"
          >
            <div
              className="flex flex-wrap items-center gap-3 text-[clamp(14px,1.1vw,16px)]"
              style={{ fontFamily: SANS }}
            >
              {info.services.map((s, i) => (
                <Fragment key={s}>
                  {i > 0 && (
                    <span
                      className="h-3 w-px"
                      style={{ background: theme.line }}
                      aria-hidden
                    />
                  )}
                  <span>{s}</span>
                </Fragment>
              ))}
            </div>
          </TabsPrimitive.Content>
        )}
      </TabsPrimitive.Root>
    </section>
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
            // Optional silent looping video thumbnail; the image is its poster.
            video: thumbVideoMedia(rc, img),
          };
        })
        .filter((s): s is CascadingSlide => s !== null),
    [data?.relatedCases],
  );
  // Match the document canvas to this case's theme so a page crossfade never
  // flashes the wrong colour through the gap. Derived before the early return
  // (and from data, not `c`) so the hook order stays stable. Light cases land
  // on the light CSS default anyway.
  useCanvasColor((data?.darkMode ? THEME.dark : THEME.light).bg);

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
        {c.hero && <HeroMedia media={c.hero} />}
        <CaseTitleBar title={c.title} client={c.client} />
        <CaseInfoTabs info={c.projectInfo} theme={theme} />
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
