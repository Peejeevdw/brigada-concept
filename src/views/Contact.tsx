"use client";

import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { BrioEffect } from "@/brio-effect";
import { GUTTER, INK } from "@/lib/siteTokens";
const gallery1 = "/assets/contact/c1.avif";
const gallery2 = "/assets/contact/c2.avif";
const gallery3 = "/assets/contact/c3.avif";
const gallery4 = "/assets/contact/c4.avif";
const gallery5 = "/assets/contact/c5.avif";
const gallery6 = "/assets/contact/c6.avif";

// Contact page — built on the shared site foundation in the new-style idiom.
// Section rhythm follows the brief: hero (modelled on /careers-v2) → contact
// form → locations → mood photo → parallax footer.

export interface ContactData {
  hero?: {
    eyebrow?: string | null;
    title?: string | null;
    brioPaletteId?: string | null;
  } | null;
  form?: {
    intro?: string | null;
    submitLabel?: string | null;
    successMessage?: string | null;
    fields?: Array<{
      _key?: string;
      name?: string | null;
      label?: string | null;
      type?: string | null;
      required?: boolean | null;
      span?: string | null;
      placeholder?: string | null;
    }> | null;
  } | null;
  expertiseContacts?: Array<{
    _key?: string;
    label?: string | null;
    person?: { name?: string | null; email?: string | null; phone?: string | null } | null;
  }> | null;
  locations?: Array<{
    _id?: string;
    title?: string | null;
    street?: string | null;
    number?: string | null;
    postalCode?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
  }> | null;
}

// Masonry gallery images (varying aspect ratios → column-flow masonry).
// Visual placeholders — not editorial copy, kept hardcoded for now.
const GALLERY = [gallery1, gallery2, gallery3, gallery4, gallery5, gallery6];

// Split images round-robin into n columns, so we can render a column-flex
// masonry whose columns stay equal-height (straight bottom edge).
const splitColumns = (items: string[], n: number) => {
  const cols: string[][] = Array.from({ length: n }, () => []);
  items.forEach((src, i) => cols[i % n].push(src));
  return cols;
};

const ContactV2 = ({ data, generalEmail, generalPhone }: { data?: ContactData | null; generalEmail?: string; generalPhone?: string } = {}) => {
  const hero = data?.hero;
  const eyebrow = hero?.eyebrow ?? "";
  const title = hero?.title ?? "";
  const brioPalette = hero?.brioPaletteId ?? "brio-05";
  const formIntro = data?.form?.intro ?? "";
  const submitLabel = data?.form?.submitLabel ?? "Send";
  const successMessage = data?.form?.successMessage ?? "";
  const fields = data?.form?.fields ?? [];
  const expertiseContacts = data?.expertiseContacts ?? [];
  const offices = (data?.locations ?? []).map((l) => ({
    city: `BRIGADA ${(l.city ?? l.title ?? "").toUpperCase()}`.trim(),
    address: [l.street, l.number].filter(Boolean).join(" "),
    zip: [l.postalCode, l.city].filter(Boolean).join(" "),
  }));
  const generalContactEmail = generalEmail ?? "";
  const generalContactPhone = generalPhone ?? "";
  // Scroll-driven background — warms from white to a soft tint across the
  // content block (same polish as /people).
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollP = useMotionValue(0);
  const bgColor = useTransform(scrollP, [0, 1], ["#FFFFFF", "#F2EEF4"]);

  useLenis(() => {
    const el = contentRef.current;
    const range = el ? el.offsetHeight - window.innerHeight : window.innerHeight;
    scrollP.set(range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0);
  });

  const [sent, setSent] = useState(false);
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No backend yet — acknowledge locally so the interaction feels complete.
    setSent(true);
  };

  // Shared input styling — transparent field with a single ink underline.
  const inputClass =
    "w-full border-b bg-transparent pb-3 text-[clamp(16px,1.4vw,20px)] outline-none transition-colors placeholder:opacity-40 focus:border-opacity-100";

  return (
    <motion.main className="min-h-screen w-full" style={{ backgroundColor: bgColor }}>
      <SiteNav homePath="/concept" textClassName="text-white" />

      {/* Content — full width (gutters only). Its height drives the bg tint. */}
      <div ref={contentRef} className="w-full">
        {/* Hero — modelled on /careers-v2: brio "Purple & Red" (brio-05) over the
            concept hero image, full-bleed behind the nav and intro text. */}
        <section
          className={`relative overflow-hidden ${GUTTER} pt-[clamp(120px,18vw,250px)] pb-[clamp(80px,12vw,160px)]`}
        >
          <div className="absolute inset-0 z-0">
            <BrioEffect
              src={`/concept-hero.jpg`}
              mode="palette"
              paletteId={brioPalette}
              className="h-full w-full"
            />
          </div>
          <div className="relative z-10">
            <Reveal>
              <p className="font-eyebrow text-white">{eyebrow}</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
              <h1 className="font-display w-full text-white">{title}</h1>
            </Reveal>
          </div>
        </section>

        {/* Contact form */}
        <section
          className={`${GUTTER} pt-[clamp(48px,7vw,96px)]`}
          style={{ color: INK.dark }}
        >
          <Reveal>
            <div className="flex flex-col gap-[clamp(40px,5vw,72px)]">
              {/* Intro + general contact — spans above the two columns. */}
              <div className="flex w-full flex-col gap-[clamp(20px,2vw,28px)] md:w-[42%]">
                <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.4]">{formIntro}</p>
                <div className="text-[clamp(14px,1.1vw,16px)] leading-[1.6]">
                  {generalContactEmail && (
                    <a
                      href={`mailto:${generalContactEmail}`}
                      className="block transition-opacity hover:opacity-60"
                    >
                      {generalContactEmail}
                    </a>
                  )}
                  {generalContactPhone && (
                    <a
                      href={`tel:${generalContactPhone.replace(/\s/g, "")}`}
                      className="block transition-opacity hover:opacity-60"
                    >
                      {generalContactPhone}
                    </a>
                  )}
                </div>
              </div>
              {/* People + addresses (left) · form (right), top-aligned. */}
              <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                {/* Left column — people + office addresses. */}
                <div className="flex w-full flex-col gap-[clamp(28px,3vw,40px)] md:w-[42%]">
                  <div className="grid grid-cols-2 gap-x-[clamp(20px,2vw,32px)] gap-y-[clamp(18px,2vw,26px)]">
                  {expertiseContacts.map((c) => {
                    const name = c.person?.name ?? "";
                    const phone = c.person?.phone ?? "";
                    const email = c.person?.email ?? "";
                    return (
                      <div key={c._key ?? c.label ?? name} className="text-[clamp(14px,1.1vw,16px)] leading-[1.5]">
                        <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                          {c.label}
                        </p>
                        <p className="mt-2">{name}</p>
                        {phone && (
                          <a
                            href={`tel:${phone.replace(/\s/g, "")}`}
                            className="block transition-opacity hover:opacity-60"
                          >
                            {phone}
                          </a>
                        )}
                        {email && (
                          <a
                            href={`mailto:${email}`}
                            className="block transition-opacity hover:opacity-60"
                          >
                            {email}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Office addresses — spaced apart from the people above. */}
                <div className="grid grid-cols-2 gap-x-[clamp(20px,2vw,32px)] gap-y-[clamp(18px,2vw,26px)] pt-[clamp(28px,3vw,40px)]">
                  {offices.map((l, i) => (
                    <div key={l.city || `o${i}`} className="text-[clamp(14px,1.1vw,16px)] leading-[1.5]">
                      <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                        {l.city}
                      </p>
                      <p className="mt-2">{l.address}</p>
                      <p>{l.zip}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full md:w-[36%]">
                {sent ? (
                  <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.5]">{successMessage}</p>
                ) : (
                  <form
                    onSubmit={onSubmit}
                    className="grid grid-cols-1 gap-y-[clamp(28px,3vw,40px)]"
                  >
                    {fields.map((f, i) => {
                      const fieldName = f.name ?? `f${i}`;
                      const isTextarea = f.type === "textarea";
                      return (
                        <div key={f._key ?? fieldName}>
                          <label
                            htmlFor={fieldName}
                            className="mb-3 block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60"
                          >
                            {f.label}
                          </label>
                          {isTextarea ? (
                            <textarea
                              id={fieldName}
                              name={fieldName}
                              rows={4}
                              required={f.required ?? false}
                              placeholder={f.placeholder ?? ""}
                              className={`${inputClass} resize-none`}
                              style={{ borderColor: INK.dark }}
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
                              style={{ borderColor: INK.dark }}
                            />
                          )}
                        </div>
                      );
                    })}
                    <div>
                      <button
                        type="submit"
                        className="group flex w-full items-center justify-center gap-2 bg-brigada-black py-[clamp(16px,1.4vw,20px)] text-[clamp(15px,1.25vw,18px)] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
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
      </div>

      {/* Masonry gallery — full-bleed to the viewport edges. Column-flex layout:
          columns stay equal-height and the last image in each column fills the
          remaining space so the grid ends flush along a straight bottom edge. */}
      <section className="pt-[clamp(24px,4vw,64px)] pb-[clamp(24px,4vw,64px)]">
        <Reveal>
          {[
            { cols: 2, className: "flex md:hidden" },
            { cols: 3, className: "hidden md:flex" },
          ].map(({ cols, className }) => (
            <div
              key={cols}
              className={`${className} items-stretch gap-[clamp(8px,1vw,16px)]`}
            >
              {splitColumns(GALLERY, cols).map((col, ci) => (
                <div
                  key={ci}
                  className="flex flex-1 flex-col gap-[clamp(8px,1vw,16px)]"
                >
                  {col.map((src, idx) => (
                    <img
                      key={idx}
                      src={src}
                      alt=""
                      loading="lazy"
                      className={
                        idx === col.length - 1
                          ? "block min-h-0 w-full flex-1 object-cover"
                          : "block w-full"
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </Reveal>
      </section>

      {/* Parallax footer — solid black, links wired to the pages. */}
      <BrandFooter dark />
    </motion.main>
  );
};

export default ContactV2;