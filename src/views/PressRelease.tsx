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
import { BRIGADA_BLACK } from "@/lib/colors";
import { urlFor } from "@/lib/sanity";

gsap.registerPlugin(ScrollTrigger);

// Press release page — data-driven twin of the /employer-branding idiom.
// A full-bleed hero photo with the headline overlaid, a two-column body
// (release copy + inline quotes left, portrait right) and a press-kit
// download list. Content comes from the `pressRelease` Sanity document via
// app/press/[slug]/page.tsx.

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
  heroImage?: SanityImage;
  body?: PortableTextBlock[] | null;
  portrait?: SanityImage;
  portraitCaption?: string | null;
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
      <h2 className="text-[clamp(20px,1.8vw,26px)]" style={{ fontWeight: 500 }}>
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
  const heroSrc = imgSrc(data?.heroImage ?? null, 2400);
  const portraitSrc = imgSrc(data?.portrait ?? null, 1400);
  const dateLabel = formatDate(data?.publishDate);
  const body = data?.body ?? [];
  const downloads = (data?.pressKit ?? []).filter((d) => d?.label);

  // Scroll-driven background — calm warm tint, same reading feel as the other
  // editorial pages.
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F6F1EA"]);

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

  return (
    <motion.main
      className="min-h-screen w-full"
      style={{ fontFamily: SANS, backgroundColor: bgColor }}
    >
      {/* White nav — sits over the dark hero photo. */}
      <SiteNav homePath="/" textClassName="text-white" />

      {/* Hero — full-bleed photo with the headline overlaid bottom-left. */}
      <section className="relative h-[clamp(440px,90vh,920px)] w-full overflow-hidden">
        {heroSrc && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroSrc}
            alt={data?.heroImage?.alt ?? ""}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)",
          }}
        />
        <div
          className={`absolute inset-x-0 bottom-0 ${GUTTER} pb-[clamp(40px,7vw,96px)]`}
        >
          {dateLabel && (
            <Reveal>
              <p className="text-[clamp(14px,1vw,16px)] text-white/80">
                Press release · {dateLabel}
              </p>
            </Reveal>
          )}
          {data?.heroTitle && (
            <Reveal delay={0.06} className="mt-[clamp(16px,1.6vw,24px)]">
              <h1
                className="w-full text-[clamp(34px,5vw,88px)] leading-[1.04] tracking-[-0.01em] text-white md:w-[72%]"
                style={{ fontWeight: 400 }}
              >
                {data.heroTitle}
              </h1>
            </Reveal>
          )}
        </div>
      </section>

      <div ref={contentRef} className="w-full">
        {/* Two-column body — release copy left, portrait right. */}
        <section className={`${GUTTER} pt-[clamp(56px,8vw,120px)]`}>
          <Reveal delay={0.12}>
            <div className="flex flex-col gap-12 md:flex-row md:justify-between">
              <div
                className="flex w-full flex-col gap-[18px] text-[20px] md:w-[46%]"
                style={{ lineHeight: "150%", color: BRIGADA_BLACK }}
              >
                <PortableText value={body} components={bodyComponents} />
              </div>

              {portraitSrc && (
                <div className="w-full md:w-[46%]">
                  <div className="md:sticky md:top-[clamp(90px,12vh,140px)]">
                    <figure className="m-0">
                      <div className="relative w-full overflow-hidden rounded-[2px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={portraitSrc}
                          alt={data?.portrait?.alt ?? ""}
                          className="block h-auto w-full"
                        />
                      </div>
                      {data?.portraitCaption && (
                        <figcaption
                          className="mt-3 text-[clamp(13px,1vw,15px)]"
                          style={{ color: INK, opacity: 0.7 }}
                        >
                          {data.portraitCaption}
                        </figcaption>
                      )}
                    </figure>
                  </div>
                </div>
              )}
            </div>
          </Reveal>
        </section>

        {/* Press kit — downloadable logo, video and images. */}
        {downloads.length > 0 && (
          <section
            className={`${GUTTER} pt-[clamp(48px,7vw,96px)] pb-[clamp(80px,12vw,180px)]`}
            style={{ color: INK }}
          >
            <Reveal>
              <div className="border-t" style={{ borderColor: INK }} />
              <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
                <h2
                  className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
                  style={{ fontWeight: 500 }}
                >
                  Press kit
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
            </Reveal>
          </section>
        )}
      </div>

      <BrandFooter dark />
    </motion.main>
  );
};

export default PressRelease;
