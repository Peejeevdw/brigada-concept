"use client";

import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import SiteNav from "@/components/site/SiteNav";
import CareersFooter from "@/components/CareersFooter";
import { usePageTransition } from "@/components/PageTransition";

gsap.registerPlugin(ScrollTrigger);

// Job detail (v2) — rebuilt in the /employer-branding idiom: self-contained
// (framer-motion, Antarctica, SiteNav + CareersFooter), full-bleed gutters,
// bordered SectionLabel sections, Lenis smooth scroll, a slow near-white
// background drift. Content comes from the Sanity `job` document; the apply
// form at the bottom is driven by `job.form`.

const SANS = '"Antarctica", system-ui, sans-serif';
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const INK = "#2d2928";

// Shared gutter — same as /concept and /employer-branding (full-bleed, gutters
// only, no centred max-width).
const GUTTER = "px-[clamp(24px,5vw,72px)]";

// Page background — a flat warm cream.
const BG = "#F0EBD3";

interface JobFormField {
  _key?: string;
  name?: string | null;
  label?: string | null;
  type?: string | null;
  required?: boolean | null;
  placeholder?: string | null;
  options?: string[] | null;
  span?: "half" | "full" | null;
}

export interface JobData {
  _id?: string;
  slug?: string | null;
  name?: string | null;
  type?: string | null;
  introIndex?: string | null;
  introDetail?: string | null;
  jobDescription?: PortableTextBlock[] | null;
  profile?: PortableTextBlock[] | null;
  offer?: PortableTextBlock[] | null;
  expertise?: { _id?: string; name?: string | null; slug?: string | null } | null;
  location?: { _id?: string; title?: string | null; city?: string | null } | null;
  contact?: {
    _id?: string;
    name?: string | null;
    position?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  form?: {
    intro?: string | null;
    submitLabel?: string | null;
    successMessage?: string | null;
    fields?: JobFormField[] | null;
  } | null;
}

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

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <h2
    className="shrink-0 text-[clamp(18px,1.5vw,22px)] uppercase leading-none"
    style={{ fontWeight: 500 }}
  >
    {children}
  </h2>
);

// PortableText rendering for the body blocks (role / profile / offer).
const portableBody = {
  block: {
    h2: ({ children }: { children?: ReactNode }) => (
      <h3 className="mt-[clamp(28px,3vw,44px)] first:mt-0 text-[clamp(20px,1.8vw,26px)] font-medium leading-[1.2]">
        {children}
      </h3>
    ),
    h3: ({ children }: { children?: ReactNode }) => (
      <h4 className="mt-[clamp(20px,2vw,32px)] text-[clamp(17px,1.4vw,20px)] font-medium leading-[1.25]">
        {children}
      </h4>
    ),
    normal: ({ children }: { children?: ReactNode }) => (
      <p className="mt-[clamp(12px,1vw,18px)] first:mt-0 text-[clamp(15px,1.25vw,18px)] leading-[1.6]">
        {children}
      </p>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="mt-[clamp(20px,2vw,32px)] border-l-2 pl-5 text-[clamp(18px,1.4vw,22px)] italic" style={{ borderColor: INK }}>
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }: { children?: ReactNode }) => (
      <ul className="mt-[clamp(12px,1vw,16px)] list-disc space-y-2 pl-5 text-[clamp(15px,1.25vw,18px)] leading-[1.6]">
        {children}
      </ul>
    ),
    number: ({ children }: { children?: ReactNode }) => (
      <ol className="mt-[clamp(12px,1vw,16px)] list-decimal space-y-2 pl-5 text-[clamp(15px,1.25vw,18px)] leading-[1.6]">
        {children}
      </ol>
    ),
  },
};

const inputClass =
  "w-full border-b border-brigada-black bg-transparent pb-3 text-[clamp(16px,1.4vw,20px)] outline-none transition-colors placeholder:opacity-40 focus:border-opacity-100";

// A bordered SectionLabel + right-column block — the /employer-branding rhythm.
const LabelledSection = ({
  label,
  children,
  delay = 0,
  wide = false,
}: {
  label: ReactNode;
  children: ReactNode;
  delay?: number;
  wide?: boolean;
}) => (
  <section className={`${GUTTER} pt-[clamp(64px,8vw,120px)]`} style={{ color: INK }}>
    <Reveal delay={delay}>
      <div className="border-t" style={{ borderColor: INK }} />
      <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
        <SectionLabel>{label}</SectionLabel>
        <div className={wide ? "w-full md:w-[58%]" : "w-full md:w-[49%]"}>{children}</div>
      </div>
    </Reveal>
  </section>
);

const JobDetail = ({ job }: { job: JobData | null }) => {
  const transitionTo = usePageTransition();
  // Local "sent" state — see TODO at the submit handler for the wiring plan.
  const [sent, setSent] = useState(false);

  // Smooth scroll — same Lenis setup as /concept + /careers, reduced-motion
  // falls back to native scroll.
  useEffect(() => {
    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  if (!job) {
    return (
      <main className="min-h-screen w-full" style={{ fontFamily: SANS, backgroundColor: BG }}>
        <SiteNav />
        <div className={`${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(80px,12vw,160px)]`}>
          <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
            Careers
          </p>
          <h1
            className="mt-6 text-[clamp(40px,5.79vw,100px)] leading-[1.04] tracking-[-0.01em] text-brigada-black"
            style={{ fontWeight: 400 }}
          >
            Job not found
          </h1>
          <button
            type="button"
            onClick={() => transitionTo("/careers")}
            className="mt-10 inline-block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] underline underline-offset-4"
          >
            ← All open jobs
          </button>
        </div>
        <CareersFooter />
      </main>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire to /api/jobs/apply. Local optimistic state only for now —
    // intentionally no network call so we surface the UI without a backend.
    setSent(true);
  };

  const city = job.location?.city || job.location?.title || "";
  const typeLabel = job.type
    ? job.type.charAt(0).toUpperCase() + job.type.slice(1)
    : "";

  const formIntro = job.form?.intro ?? "";
  const submitLabel = job.form?.submitLabel ?? "Send application";
  const successMessage = job.form?.successMessage ?? "";
  const formFields = job.form?.fields ?? [];

  return (
    <motion.main
      className="min-h-screen w-full"
      style={{ fontFamily: SANS, backgroundColor: BG }}
    >
      <SiteNav />

      <div className="w-full">
        {/* Intro — back-link, title, lead + meta (the /employer-branding intro). */}
        <section className={`${GUTTER} pt-[clamp(110px,15vw,200px)] pb-[clamp(48px,8vw,120px)]`}>
          <Reveal>
            <button
              type="button"
              onClick={() => transitionTo("/careers")}
              className="group inline-flex items-center gap-2 text-[clamp(14px,1vw,16px)] text-brigada-black transition-opacity hover:opacity-60"
            >
              <span className="relative top-[-2px] inline-block transition-transform duration-300 ease-out group-hover:-translate-x-1">
                ←
              </span>
              <span>Careers</span>
            </button>
          </Reveal>
          <Reveal delay={0.06} className="mt-[clamp(20px,2vw,32px)]">
            <h1
              className="w-full text-[clamp(40px,5.79vw,100px)] leading-[1.04] tracking-[-0.01em] text-brigada-black"
              style={{ fontWeight: 400 }}
            >
              {job.name}
            </h1>
          </Reveal>

          <Reveal delay={0.12} className="mt-[clamp(56px,7vw,128px)]">
            <div className="flex flex-col gap-10 md:flex-row md:justify-between">
              {/* Left — lead intro */}
              {job.introDetail && (
                <p
                  className="w-full text-[clamp(20px,2.2vw,32px)] leading-[1.35] text-brigada-black md:w-[55%]"
                  style={{ fontWeight: 400 }}
                >
                  {job.introDetail}
                </p>
              )}
              {/* Right — at-a-glance meta. Nudged down on desktop so the first
                  label/border lines up with the cap height of the lead copy. */}
              <div className="w-full text-[clamp(15px,1.25vw,18px)] leading-[1.5] md:mt-[clamp(10px,1.4vw,22px)] md:w-[32%]" style={{ color: INK }}>
                {typeLabel && (
                  <div className="border-t pt-3" style={{ borderColor: INK }}>
                    <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                      Employment
                    </p>
                    <p className="mt-1">{typeLabel}</p>
                  </div>
                )}
                {city && (
                  <div className="mt-6 border-t pt-3" style={{ borderColor: INK }}>
                    <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                      Location
                    </p>
                    <p className="mt-1">{city}</p>
                  </div>
                )}
                {job.expertise?.name && (
                  <div className="mt-6 border-t pt-3" style={{ borderColor: INK }}>
                    <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                      Team
                    </p>
                    <p className="mt-1">{job.expertise.name}</p>
                  </div>
                )}
                <a
                  href="#apply"
                  className="group mt-8 inline-flex items-center gap-2 text-[clamp(14px,1vw,16px)] transition-opacity hover:opacity-60"
                >
                  <span>Apply for this role</span>
                  <span className="relative top-[-1px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                    →
                  </span>
                </a>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Body — role / profile / offer */}
        {job.jobDescription && job.jobDescription.length > 0 && (
          <LabelledSection label="The role">
            <PortableText value={job.jobDescription} components={portableBody} />
          </LabelledSection>
        )}
        {job.profile && job.profile.length > 0 && (
          <LabelledSection label="Your profile" delay={0.04}>
            <PortableText value={job.profile} components={portableBody} />
          </LabelledSection>
        )}
        {job.offer && job.offer.length > 0 && (
          <LabelledSection label="What we offer" delay={0.04}>
            <PortableText value={job.offer} components={portableBody} />
          </LabelledSection>
        )}

        {/* Contact */}
        {job.contact && (
          <LabelledSection label="Questions?" delay={0.04}>
            <p className="text-[clamp(18px,1.4vw,22px)] font-medium">{job.contact.name}</p>
            {job.contact.position && (
              <p className="mt-1 text-[clamp(15px,1.25vw,18px)] opacity-70">
                {job.contact.position}
              </p>
            )}
            <div className="mt-3 space-y-1 text-[clamp(15px,1.25vw,18px)]">
              {job.contact.email && (
                <a
                  href={`mailto:${job.contact.email}`}
                  className="block transition-opacity hover:opacity-60"
                >
                  {job.contact.email}
                </a>
              )}
              {job.contact.phone && (
                <a
                  href={`tel:${job.contact.phone.replace(/\s/g, "")}`}
                  className="block opacity-70 transition-opacity hover:opacity-100"
                >
                  {job.contact.phone}
                </a>
              )}
            </div>
          </LabelledSection>
        )}

        {/* Apply form */}
        {job.form && formFields.length > 0 && (
          <section
            id="apply"
            className={`${GUTTER} scroll-mt-24 pt-[clamp(64px,8vw,120px)] pb-[clamp(80px,12vw,180px)]`}
            style={{ color: INK }}
          >
            <Reveal>
              <div className="border-t" style={{ borderColor: INK }} />
              <div className="mt-[clamp(20px,2vw,26px)] flex flex-col gap-8 md:flex-row md:justify-between">
                <SectionLabel>Apply</SectionLabel>
                <div className="w-full md:w-[49%]">
                  <h3
                    className="text-[clamp(26px,3vw,44px)] leading-[1.1] tracking-[-0.01em] text-brigada-black"
                    style={{ fontWeight: 400 }}
                  >
                    Apply for {job.name}
                  </h3>
                  {formIntro && (
                    <p className="mt-[clamp(14px,1.4vw,22px)] text-[clamp(15px,1.25vw,18px)] leading-[1.6]">
                      {formIntro}
                    </p>
                  )}

                  <div className="mt-[clamp(32px,4vw,52px)]">
                    {sent ? (
                      <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.5]">
                        {successMessage}
                      </p>
                    ) : (
                      <form
                        onSubmit={onSubmit}
                        className="grid grid-cols-1 gap-y-[clamp(28px,3vw,40px)] sm:grid-cols-2 sm:gap-x-[clamp(20px,2vw,32px)]"
                      >
                        {formFields.map((f, i) => {
                          const fieldName = f.name ?? `f${i}`;
                          const colSpan =
                            f.span === "half" ? "sm:col-span-1" : "sm:col-span-2";
                          return (
                            <div key={f._key ?? fieldName} className={colSpan}>
                              <label
                                htmlFor={fieldName}
                                className="mb-3 block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60"
                              >
                                {f.label}
                                {f.required ? " *" : ""}
                              </label>
                              {f.type === "textarea" ? (
                                <textarea
                                  id={fieldName}
                                  name={fieldName}
                                  rows={5}
                                  required={f.required ?? false}
                                  placeholder={f.placeholder ?? ""}
                                  className={`${inputClass} resize-none`}
                                />
                              ) : f.type === "select" ? (
                                <select
                                  id={fieldName}
                                  name={fieldName}
                                  required={f.required ?? false}
                                  className={inputClass}
                                >
                                  <option value="">{f.placeholder ?? "Select…"}</option>
                                  {(f.options ?? []).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : f.type === "file" ? (
                                <input
                                  id={fieldName}
                                  name={fieldName}
                                  type="file"
                                  required={f.required ?? false}
                                  accept=".pdf,.doc,.docx"
                                  className={`${inputClass} pb-2 file:mr-4 file:border-0 file:bg-transparent file:text-[clamp(13px,1vw,15px)] file:uppercase file:tracking-[0.1em]`}
                                />
                              ) : (
                                <input
                                  id={fieldName}
                                  name={fieldName}
                                  type={f.type ?? "text"}
                                  required={f.required ?? false}
                                  placeholder={f.placeholder ?? ""}
                                  autoComplete="off"
                                  className={inputClass}
                                />
                              )}
                            </div>
                          );
                        })}
                        <div className="sm:col-span-2">
                          <button
                            type="submit"
                            className="group flex items-center gap-2 bg-brigada-black px-[clamp(32px,3vw,48px)] py-[clamp(16px,1.4vw,20px)] text-[clamp(13px,1.05vw,15px)] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
                          >
                            <span>{submitLabel}</span>
                            <span className="relative top-[-1px] inline-block transition-transform duration-300 ease-out group-hover:translate-x-1">
                              →
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        )}
      </div>

      <CareersFooter />
    </motion.main>
  );
};

export default JobDetail;
