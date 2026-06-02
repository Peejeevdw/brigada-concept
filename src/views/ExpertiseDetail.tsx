"use client";

import { ArrowUpRight } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import ScrollUnderline from "@/components/ScrollUnderline";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  expertiseTransition,
  useExpertiseTransition,
} from "@/lib/expertiseTransition";
import Appear from "@/components/Appear";
import RevealChildren from "@/components/RevealChildren";
import { pillarContent } from "@/data/pillars";
import { type Pillar } from "@/components/wireframe/WorkThumb";
import BrioImageComposite from "@/components/BrioImageComposite";
import PillarCasesCarousel from "@/components/PillarCasesCarousel";
import { DEFAULT_BRIO_SETTINGS } from "@/data/duotones";
const brandDesignerHero = "/assets/brand-designer-hero.jpg";
const productDesignerHero = "/assets/product-designer-hero.jpg";
const marketingStrategistHero = "/assets/marketing-strategist-hero.jpg";
const peopleLeadHero = "/assets/people-lead-hero.jpg";
const evaImg = "/assets/team/eva.jpg";
const lukasImg = "/assets/team/lukas.jpg";
const marieImg = "/assets/team/marie.jpg";
const tomImg = "/assets/team/tom.jpg";

const pillarMap: Record<string, Pillar | undefined> = {
  brand: "Brand",
  marketing: "Marketing",
  product: "Product",
  people: "People",
};

interface PillarMeta {
  contact: { firstName: string; fullName: string; role: string; image: string; email: string; phone: string };
  hero: string;
}

const pillarMeta: Record<Pillar, PillarMeta> = {
  Brand: {
    contact: { firstName: "Eva", fullName: "Eva", role: "Brand Lead", image: evaImg, email: "eva@brigada.be", phone: "+00 000 00 00" },
    hero: brandDesignerHero,
  },
  Product: {
    contact: { firstName: "Jeroen", fullName: "Jeroen De Bock", role: "Client Partner", image: lukasImg, email: "jeroen.debock@brigada.be", phone: "+32 477 62 76 01" },
    hero: brandDesignerHero,
  },
  Marketing: {
    contact: { firstName: "Tom", fullName: "Tom", role: "Marketing Lead", image: tomImg, email: "tom@brigada.be", phone: "+00 000 00 00" },
    hero: brandDesignerHero,
  },
  People: {
    contact: { firstName: "Marie", fullName: "Marie", role: "People Lead", image: marieImg, email: "marie@brigada.be", phone: "+00 000 00 00" },
    hero: brandDesignerHero,
  },
};

const ExpertiseDetail = () => {
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug ?? "";
  const pillar = pillarMap[slug];

  const t = useExpertiseTransition();
  // Snapshot whether we arrived via the slide-in transition.
  const [arrivedViaTransition] = useState(
    () => t.phase === "settling" && t.slug === slug,
  );
  const [heroSwapped, setHeroSwapped] = useState(!arrivedViaTransition);

  useLayoutEffect(() => {
    if (!arrivedViaTransition) return;
    window.scrollTo(0, 0);
  }, [arrivedViaTransition]);

  useLayoutEffect(() => {
    if (!arrivedViaTransition) return;
    // Next frame: swap destination hero in (identical to overlay) and
    // dismiss the overlay so the handoff is invisible.
    const r = requestAnimationFrame(() => {
      setHeroSwapped(true);
      requestAnimationFrame(() => expertiseTransition.reset());
    });
    return () => cancelAnimationFrame(r);
  }, [arrivedViaTransition]);

  useEffect(() => {
    return () => {
      if (expertiseTransition.get().phase !== "idle") {
        expertiseTransition.reset();
      }
    };
  }, []);

  if (!pillar) {
    return (
      <article className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
        <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2">
          <h1 className="font-title">Expertise</h1>
          <p className="font-body mt-4">Unknown pillar.</p>
        </section>
      </article>
    );
  }

  const content = pillarContent[pillar];
  const meta = pillarMeta[pillar];
  const contact = meta.contact;
  const useStaticHero = arrivedViaTransition;

  return (
    <article className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      {/* HERO */}
      <section
        className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10"
        style={{ visibility: heroSwapped ? "visible" : "hidden" }}
      >
        <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
          {useStaticHero ? (
            <>
              <p className="font-nav" style={{ color: "#2D2928" }}>{content.eyebrow}</p>
              <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>{pillar}</h2>
              <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl" style={{ color: "#2D2928" }}>
                {content.intro}
              </p>
            </>
          ) : (
            <>
              <Appear from="up" delay={60}>
                <p className="font-nav" style={{ color: "#2D2928" }}>{content.eyebrow}</p>
              </Appear>
              <Appear from="up" delay={140}>
                <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>{pillar}</h2>
              </Appear>
              <Appear from="up" delay={240}>
                <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl" style={{ color: "#2D2928" }}>
                  {content.intro}
                </p>
              </Appear>
            </>
          )}
        </div>
      </section>

      <div className="pt-8 md:pt-12" />

      {/* DIVIDER */}
      <div className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="font-body border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />
      </div>

      {/* PILLAR SERVICES */}
      <section className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <div className="grid grid-cols-6 gap-x-3 md:gap-x-5 gap-y-6 items-start">
          <div className="col-span-6 md:col-span-3 md:col-start-1 md:row-start-1">
            <p className="font-title">{pillar}</p>
          </div>

          <div className="col-span-6 md:col-span-3 md:col-start-4 md:row-start-1 flex flex-col gap-6">


            {content.services.map((s) => (
              <RevealChildren as="p" key={s.title} className="font-body text-left group cursor-default">
                <ScrollUnderline>{s.title}</ScrollUnderline>
              </RevealChildren>
            ))}
          </div>
        </div>
      </section>

      <div className="pt-[5.5em]" />


      {/* LEAD */}
      <section className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <div className="grid grid-cols-6 gap-3 md:gap-5 items-start">
          <div className="hidden md:block md:col-span-3 md:col-start-1" />
          <div className="col-span-6 md:col-span-3 md:col-start-4 font-body text-left">
            <hr className="border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />



            <RevealChildren as="p" className="font-body text-left">
              {content.leadIn.replace("{name}", contact.firstName)}
            </RevealChildren>
            <p className="mt-[1lh]">{contact.fullName}</p>
            <p>{contact.role}</p>
            <p className="mt-[1lh]">{contact.phone}</p>
            <p>{contact.email}</p>
          </div>
        </div>
      </section>

      {/* RELATED WORK */}
      <div className="ws-2" />
      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="font-body border-0 border-t border-[#2D2928] m-0 mb-8 md:mb-10" />
      </div>
      <PillarCasesCarousel
        pillar={pillar}
        perPage={2}
        title={`${pillar.toUpperCase()} CASES`}
        ctaTo="/work"
        ctaLabel="(All work)"
      />
      <div className="ws-2" />
    </article>
  );
};

export default ExpertiseDetail;