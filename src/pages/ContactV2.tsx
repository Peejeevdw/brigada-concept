import { motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState } from "react";
import { useLenis } from "@/hooks/useLenis";
import SiteNav from "@/components/site/SiteNav";
import Reveal from "@/components/site/Reveal";
import BrandFooter from "@/components/BrandFooter";
import { BrioEffect } from "@/brio-effect";
import { GUTTER, INK } from "@/lib/siteTokens";
import gallery1 from "@/assets/contact/c1.avif";
import gallery2 from "@/assets/contact/c2.avif";
import gallery3 from "@/assets/contact/c3.avif";
import gallery4 from "@/assets/contact/c4.avif";
import gallery5 from "@/assets/contact/c5.avif";
import gallery6 from "@/assets/contact/c6.avif";

// Contact page — built on the shared site foundation in the new-style idiom.
// Section rhythm follows the brief: hero (modelled on /careers-v2) → contact
// form → locations → mood photo → parallax footer.

// Office locations (same data as the legacy /contact page).
// Masonry gallery images (varying aspect ratios → column-flow masonry).
const GALLERY = [gallery1, gallery2, gallery3, gallery4, gallery5, gallery6];

// Split images round-robin into n columns, so we can render a column-flex
// masonry whose columns stay equal-height (straight bottom edge).
const splitColumns = (items: string[], n: number) => {
  const cols: string[][] = Array.from({ length: n }, () => []);
  items.forEach((src, i) => cols[i % n].push(src));
  return cols;
};

const LOCATIONS = [
  { city: "BRIGADA ANTWERP", address: "Molenstraat 54", zip: "2018 Antwerpen" },
  { city: "BRIGADA GENT", address: "Amelia Earhartlaan 2 Bus 401", zip: "9051 Gent" },
  { city: "BRIGADA BRUSSELS", address: "Waelhemstraat 77", zip: "1030 Schaarbeek" },
];

// Form fields — single-column underline inputs in the new-style aesthetic.
const FIELDS = [
  { name: "name", label: "Name", type: "text", full: false },
  { name: "company", label: "Company", type: "text", full: false },
  { name: "email", label: "Email", type: "email", full: false },
  { name: "phone", label: "Phone", type: "tel", full: false },
  { name: "project", label: "Project", type: "text", full: true },
] as const;

// General contact details.
const GENERAL = { email: "hello@brigada.be", phone: "+32 9 123 45 67" };

// Per-expertise leads (pulled from the /brand, /product, /people, /marketing
// contact blocks). Shown under "Hi there" so visitors can reach a discipline
// lead directly.
const EXPERTISE_CONTACTS = [
  { label: "Brand", name: "Mathias", email: "mathias@brigada.be", phone: "+32 477 11 22 33" },
  { label: "Product", name: "Jeroen De Bock", email: "jeroen.debock@brigada.be", phone: "+32 477 62 76 01" },
  { label: "People", name: "Marie", email: "marie@brigada.be", phone: "+32 477 44 55 66" },
  { label: "Marketing", name: "Sofie", email: "sofie@brigada.be", phone: "+32 477 77 88 99" },
];

const ContactV2 = () => {
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
              src={`${import.meta.env.BASE_URL}concept-hero.jpg`}
              mode="palette"
              paletteId="brio-05"
              className="h-full w-full"
            />
          </div>
          <div className="relative z-10">
            <Reveal>
              <p className="font-eyebrow text-white">Get in touch</p>
            </Reveal>
            <Reveal delay={0.08} className="mt-[clamp(18px,1.7vw,25px)]">
              <h1 className="font-display w-full text-white">
                Fill out the form or email us, and we'll get back to you within
                two working days.
              </h1>
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
                <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.4]">
                  You can also call us, or swing by one of our offices. In any
                  case, we're most useful when you involve us early on.
                </p>
                <div className="text-[clamp(14px,1.1vw,16px)] leading-[1.6]">
                  <a
                    href={`mailto:${GENERAL.email}`}
                    className="block transition-opacity hover:opacity-60"
                  >
                    {GENERAL.email}
                  </a>
                  <a
                    href={`tel:${GENERAL.phone.replace(/\s/g, "")}`}
                    className="block transition-opacity hover:opacity-60"
                  >
                    {GENERAL.phone}
                  </a>
                </div>
              </div>
              {/* People + addresses (left) · form (right), top-aligned. */}
              <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                {/* Left column — people + office addresses. */}
                <div className="flex w-full flex-col gap-[clamp(28px,3vw,40px)] md:w-[42%]">
                  <div className="grid grid-cols-2 gap-x-[clamp(20px,2vw,32px)] gap-y-[clamp(18px,2vw,26px)]">
                  {EXPERTISE_CONTACTS.map((c) => (
                    <div key={c.label} className="text-[clamp(14px,1.1vw,16px)] leading-[1.5]">
                      <p className="text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60">
                        {c.label}
                      </p>
                      <p className="mt-2">{c.name}</p>
                      <a
                        href={`tel:${c.phone.replace(/\s/g, "")}`}
                        className="block transition-opacity hover:opacity-60"
                      >
                        {c.phone}
                      </a>
                      <a
                        href={`mailto:${c.email}`}
                        className="block transition-opacity hover:opacity-60"
                      >
                        {c.email}
                      </a>
                    </div>
                  ))}
                </div>
                {/* Office addresses — spaced apart from the people above. */}
                <div className="grid grid-cols-2 gap-x-[clamp(20px,2vw,32px)] gap-y-[clamp(18px,2vw,26px)] pt-[clamp(28px,3vw,40px)]">
                  {LOCATIONS.map((l) => (
                    <div key={l.city} className="text-[clamp(14px,1.1vw,16px)] leading-[1.5]">
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
                  <p className="text-[clamp(18px,1.6vw,24px)] leading-[1.5]">
                    Thanks — your message is on its way. We'll get back to you
                    within two working days.
                  </p>
                ) : (
                  <form
                    onSubmit={onSubmit}
                    className="grid grid-cols-1 gap-y-[clamp(28px,3vw,40px)]"
                  >
                    {FIELDS.map((f) => (
                      <div key={f.name}>
                        <label
                          htmlFor={f.name}
                          className="mb-3 block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60"
                        >
                          {f.label}
                        </label>
                        <input
                          id={f.name}
                          name={f.name}
                          type={f.type}
                          autoComplete="off"
                          className={inputClass}
                          style={{ borderColor: INK.dark }}
                        />
                      </div>
                    ))}
                    <div>
                      <label
                        htmlFor="message"
                        className="mb-3 block text-[clamp(11px,0.9vw,13px)] uppercase tracking-[0.12em] opacity-60"
                      >
                        Message
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        className={`${inputClass} resize-none`}
                        style={{ borderColor: INK.dark }}
                      />
                    </div>
                    <div>
                      <button
                        type="submit"
                        className="group flex w-full items-center justify-center gap-2 bg-brigada-black py-[clamp(16px,1.4vw,20px)] text-[clamp(15px,1.25vw,18px)] uppercase tracking-[0.1em] text-white transition-opacity hover:opacity-80"
                      >
                        <span>Send</span>
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
