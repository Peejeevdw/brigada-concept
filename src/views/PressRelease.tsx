"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  PortableText,
  type PortableTextBlock,
  type PortableTextComponents,
} from "@portabletext/react";
import SiteNav from "@/components/site/SiteNav";
import BrandFooter from "@/components/BrandFooter";
import { HeroMedia, toMedia, type SanityMedia } from "@/components/case-media";
import { BRIGADA_BLACK } from "@/lib/colors";
import { urlFor } from "@/lib/sanity";

gsap.registerPlugin(ScrollTrigger);

// Press release page — data-driven twin of the /employer-branding idiom.
// A full-bleed hero (image or video, same options as the case detail pages),
// then the headline + a two-column body (release copy + inline quotes left,
// portrait right) and a press-kit download list. Content comes from the
// `pressRelease` Sanity document via app/press/[slug]/page.tsx.

const SANS = '"Antarctica", system-ui, sans-serif';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const INK = "#2d2928";
const GUTTER = "px-[clamp(24px,5vw,72px)]";

type SanityImage = {
  alt?: string | null;
  asset?: { _id?: string; url?: string } | null;
} | null;

export type PressReleaseData = {
  _id?: string;
  title?: string | null;
  noindex?: boolean | null;
  slug?: string | null;
  publishDate?: string | null;
  heroTitle?: string | null;
  heroMedia?: SanityMedia | null;
  heroSound?: boolean | null;
  heroImage?: SanityImage;
  body?: PortableTextBlock[] | null;
  portrait?: SanityImage;
  portraitCaption?: string | null;
  sidebarQuote?: { text?: string | null; author?: string | null; role?: string | null } | null;
  sidebarImage?: SanityImage;
  pressKit?: Array<{
    _key: string;
    label?: string | null;
    meta?: string | null;
    url?: string | null;
    fileUrl?: string | null;
  }> | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    image?: SanityImage;
  } | null;
} | null;

const imgSrc = (img: SanityImage, width: number): string | null => {
  if (!img?.asset?._id) return img?.asset?.url ?? null;
  return (
    urlFor({ _type: "image", asset: { _type: "reference", _ref: img.asset._id } })
      ?.width(width)
      .auto("format")
      .url() ?? img.asset.url ?? null
  );
};

const formatDate = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
};

// Subtle fade-up reveal on scroll into view (concept-style polish).
const Reveal = ({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10% 0px" }}
    transition={{ duration: 0.7, ease: EASE_OUT, delay }}
  >
    {children}
  </motion.div>
);

// Portable Text renderer for the left column — paragraphs, the occasional
// heading, and attributed quote blocks. Quote text keeps the body font size.
const bodyComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => (
      <h2
        className="text-[clamp(27px,2.5vw,32px)] leading-[1.15] md:mt-[clamp(16px,2vw,40px)]"
        // Negative margin cancels most of the body's flex gap so a heading
        // hugs the paragraph directly under it (≈8px), while the full gap above
        // still separates it from the previous section.
        style={{ fontWeight: 500, marginBottom: "calc(8px - clamp(24px, 2.4vw, 36px))" }}
      >
        {children}
      </h2>
    ),
  },
  types: {
    quote: ({ value }) => (
      <blockquote
        className="my-[clamp(8px,1.5vw,20px)] border-l pl-[clamp(16px,1.5vw,24px)]"
        style={{ borderColor: INK }}
      >
        <p>&ldquo;{value?.text}&rdquo;</p>
        {(value?.author || value?.role) && (
          <footer
            className="mt-3 text-[clamp(13px,1vw,15px)]"
            style={{ opacity: 0.7 }}
          >
            {[value?.author, value?.role].filter(Boolean).join(" — ")}
          </footer>
        )}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
  },
};

const PressRelease = ({ data }: { data: PressReleaseData }) => {
  // Hero — prefer the video/image media (same pipeline as the case hero);
  // fall back to the legacy still image. Defaults to a silent loop, but honours
  // the `showControls` toggle. The custom sound button only applies when there
  // are no native controls (which already carry volume), so the two don't clash.
  const heroControls = !!data?.heroMedia?.showControls;
  const heroMedia = data?.heroMedia
    ? toMedia(data.heroMedia, 3840, {
        soundToggle: !!data.heroSound && !heroControls,
      })
    : null;
  const heroSrc = imgSrc(data?.heroImage ?? null, 2400);
  const dateLabel = formatDate(data?.publishDate);
  const body = data?.body ?? [];
  const downloads = (data?.pressKit ?? []).filter((d) => d?.label);

  // On mobile the Senta card drops into the body flow just before the
  // "A new model" heading; on desktop it lives in the right column. Split the
  // body there (falls back to "all before / nothing after" if not found).
  const blockText = (b: PortableTextBlock): string =>
    Array.isArray((b as { children?: { text?: string }[] }).children)
      ? (b as { children?: { text?: string }[] }).children!.map((c) => c?.text ?? "").join("")
      : "";
  const splitIdx = body.findIndex(
    (b) => (b as { style?: string }).style === "h2" && blockText(b) === "A new model",
  );
  const bodyBefore = splitIdx >= 0 ? body.slice(0, splitIdx) : body;
  const bodyAfter = splitIdx >= 0 ? body.slice(splitIdx) : [];

  // Scroll-driven background — calm warm tint, same reading feel as the other
  // editorial pages.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  // Stay on the warm end-tint from the top (no white→tint scroll fade) so the
  // white quote card always has contrast — important on mobile, where the card
  // sits high on the page.
  const bgColor = useTransform(scrollP, [0, 1], ["#F6F1EA", "#F6F1EA"]);

  useEffect(() => {
    const updateProgress = () => {
      const el = contentRef.current;
      const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
      scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
    };
    updateProgress();
    window.addEventListener("resize", updateProgress);

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      window.addEventListener("scroll", updateProgress, { passive: true });
      return () => {
        window.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
      };
    }

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", updateProgress);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      window.removeEventListener("resize", updateProgress);
    };
  }, [scrollP]);

  // The Senta card — rendered in two spots (mobile: inline before "A new
  // model"; desktop: right column). Same markup, different wrapper.
  const sentaCard = data?.sidebarQuote?.text ? (
    <div className="rounded-[6px] bg-white p-[clamp(20px,2vw,36px)]">
      <div className="flex flex-col-reverse gap-[clamp(20px,2.5vw,40px)] sm:flex-row sm:items-start">
        {/* lg+: the column hugs the (fluidly-shrinking) photo instead of
            reserving a fixed 46%, so the gap to the text stays constant. */}
        <div className="w-full sm:w-[46%] lg:w-auto lg:shrink-0">
          {/* Small/medium screens: cropped to 4:5 (less tall, keeps the photo
              compact). Large screens (lg+): natural portrait ratio, with a
              fluid height that scales the photo down with the viewport between
              ~1000px and ~1728px (clamped flat outside that range). */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[2px] lg:aspect-auto lg:w-auto">
            {/* Served from the Sanity CDN (cdn.sanity.io) so it isn't gated by
                brigada.be's Cloudflare Access; falls back to the public file. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc(data?.sidebarImage ?? null, 1200) ?? "/Senta_Slingerland.jpg"}
              alt={data?.sidebarImage?.alt ?? "Senta Slingerland, Chief Strategy Officer of Brigada"}
              className="absolute inset-0 h-full w-full object-cover object-[center_22%] lg:static lg:h-[clamp(360px,36vw,620px)] lg:w-auto"
            />
          </div>
        </div>
        <blockquote className="m-0 w-full sm:w-[44%] lg:flex-1">
          <p
            className="text-[clamp(19px,1.3vw,21px)] leading-[1.5] text-brigada-black"
            // Hanging punctuation: pull the opening quote into the margin so the
            // text block stays optically aligned.
            style={{ fontWeight: 400, textIndent: "-0.45em" }}
          >
            &ldquo;{data.sidebarQuote.text}&rdquo;
          </p>
          {(data.sidebarQuote.author || data.sidebarQuote.role) && (
            <footer
              className="mt-3 text-[clamp(12px,0.85vw,14px)]"
              style={{ color: INK, opacity: 0.7 }}
            >
              {[data.sidebarQuote.author, data.sidebarQuote.role]
                .filter(Boolean)
                .join(" — ")}
            </footer>
          )}
        </blockquote>
      </div>
    </div>
  ) : null;

  return (
    <motion.main
      className="min-h-screen w-full"
      style={{ fontFamily: SANS, backgroundColor: bgColor }}
    >
      {/* Dark nav — light page; the progressive-blur backdrop keeps it legible
          over the hero media too. Matches the case detail (light) convention. */}
      <SiteNav homePath="/" textClassName="text-brigada-black" />

      {/* Hero — full-bleed video or image, always filling 90vh (same pipeline
          as the case hero; the media object-covers the box). */}
      {heroMedia ? (
        <HeroMedia media={heroMedia} className="relative h-[90vh] w-full overflow-hidden" />
      ) : (
        heroSrc && (
          <section className="relative h-[90vh] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroSrc}
              alt={data?.heroImage?.alt ?? ""}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </section>
        )
      )}

      <div ref={contentRef} className="w-full">
        {/* Title — eyebrow + headline, centred above the release copy. */}
        <section className={`${GUTTER} pt-[clamp(48px,7vw,110px)]`}>
          <div className="mx-auto w-full max-w-[920px] text-left">
            {dateLabel && (
              <Reveal>
                <p className="text-[clamp(14px,1vw,16px)] text-brigada-black">
                  {dateLabel}
                </p>
              </Reveal>
            )}
            {data?.heroTitle && (
              <Reveal delay={0.06} className="mt-[clamp(16px,1.6vw,24px)]">
                <h1
                  className="text-[clamp(34px,5vw,88px)] leading-[1.04] tracking-[-0.01em] text-brigada-black"
                  style={{ fontWeight: 400 }}
                >
                  {data.heroTitle}
                </h1>
              </Reveal>
            )}
          </div>
        </section>

        {/* Single centred reading column — release copy with the Senta quote
            card inline between the sections (same approach as mobile, now on
            desktop too). */}
        <section className={`${GUTTER} pt-[clamp(40px,5vw,72px)]`}>
          <Reveal delay={0.12}>
            <div
              className="mx-auto flex w-full max-w-[920px] flex-col gap-[clamp(24px,2.4vw,36px)] text-[20px]"
              style={{ lineHeight: "150%", color: BRIGADA_BLACK }}
            >
              <PortableText value={bodyBefore} components={bodyComponents} />
              {/* Quote card drops into the body flow before "A new model". */}
              {sentaCard && (
                <div className="my-[clamp(8px,1.5vw,20px)]">{sentaCard}</div>
              )}
              {bodyAfter.length > 0 && (
                <PortableText value={bodyAfter} components={bodyComponents} />
              )}
            </div>
          </Reveal>
        </section>

        {/* Press kit — downloadable logo, video and images. */}
        {downloads.length > 0 && (
          <section
            className={`${GUTTER} pt-[clamp(48px,7vw,96px)] pb-[clamp(48px,7vw,96px)]`}
            style={{ color: INK }}
          >
            <Reveal>
              <div className="mx-auto w-full max-w-[920px]">
              <div className="border-t" style={{ borderColor: INK }} />
              <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
                <h2
                  className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
                  style={{ fontWeight: 500 }}
                >
                  Info kit
                </h2>
                <ul className="w-full md:w-[70%]">
                  {downloads.map((d) => {
                    const href = d.fileUrl || d.url || undefined;
                    return (
                      <li
                        key={d._key}
                        className="border-b"
                        style={{ borderColor: INK }}
                      >
                        <a
                          href={href}
                          download={d.fileUrl ? "" : undefined}
                          target={d.url && !d.fileUrl ? "_blank" : undefined}
                          rel={d.url && !d.fileUrl ? "noreferrer" : undefined}
                          className="group flex items-center justify-between gap-6 py-[clamp(16px,1.6vw,22px)] transition-opacity hover:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                          aria-disabled={href ? undefined : true}
                        >
                          <span className="flex flex-col gap-1">
                            <span
                              className="text-[clamp(20px,1.8vw,26px)]"
                              style={{ fontWeight: 400 }}
                            >
                              {d.label}
                            </span>
                            {d.meta && (
                              <span
                                className="text-[clamp(13px,1vw,15px)] uppercase tracking-[0.08em]"
                                style={{ opacity: 0.6 }}
                              >
                                {d.meta}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-[clamp(18px,1.4vw,22px)] transition-transform duration-300 ease-out group-hover:translate-y-1">
                            ↓
                          </span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
              </div>
            </Reveal>
          </section>
        )}
      </div>

      <BrandFooter dark />
    </motion.main>
  );
};

export default PressRelease;
