"use client";

import { ArrowUpRight } from "lucide-react";
import Appear from "@/components/Appear";
import RevealChildren from "@/components/RevealChildren";
import { pillarContent } from "@/data/pillars";
import type { Pillar } from "@/components/wireframe/WorkThumb";

import evaImg from "@/assets/team/eva.jpg";
import lukasImg from "@/assets/team/lukas.jpg";
import marieImg from "@/assets/team/marie.jpg";
import tomImg from "@/assets/team/tom.jpg";
import brandHero from "@/assets/brand-designer-hero.jpg";
import productHero from "@/assets/product-designer-hero.jpg";
import peopleHero from "@/assets/people-lead-hero.jpg";
import marketingHero from "@/assets/marketing-strategist-hero.jpg";
import ParallaxBanner from "@/components/home-v4-v2/ParallaxBanner";
import bannerImage from "@/assets/expertise-banner.png";

interface PillarEntry {
  label: Pillar;
  slug: string;
  image: string;
  contact: { name: string; role: string; image: string; email: string; phone: string };
}

const pillars: PillarEntry[] = [
  { label: "Brand", slug: "brand", image: brandHero, contact: { name: "Eva", role: "Brand Lead", image: evaImg, email: "eva@brigada.be", phone: "+00 000 00 00" } },
  { label: "Product", slug: "product", image: productHero, contact: { name: "Lukas", role: "Product Lead", image: lukasImg, email: "lukas@brigada.be", phone: "+00 000 00 00" } },
  { label: "People", slug: "people", image: peopleHero, contact: { name: "Marie", role: "People Lead", image: marieImg, email: "marie@brigada.be", phone: "+00 000 00 00" } },
  { label: "Marketing", slug: "marketing", image: marketingHero, contact: { name: "Tom", role: "Marketing Lead", image: tomImg, email: "tom@brigada.be", phone: "+00 000 00 00" } },
];

const Expertise = () => {
  return (
    <article
      className="bg-[#f3f2ef]"
      style={{ color: "#2D2928" }}
    >

      {/* HERO */}
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-6 md:pt-10">
        <div className="relative w-full aspect-[8/3] flex flex-col items-center justify-center text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav" style={{ color: "#2D2928" }}>The things we do (for love)</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h2 className="font-hero mt-3 md:mt-4" style={{ color: "#2D2928" }}>Our services</h2>
          </Appear>
          <Appear from="up" delay={240}>
            <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl" style={{ color: "#2D2928" }}>
              To make sharp decisions, you need to see the bigger picture. That's why we bring together the four key domains of brand, product, people and marketing.
            </p>
          </Appear>
        </div>
      </section>

      <div className="pt-8 md:pt-12" />

      {/* CONTENT GRID */}
      <section className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <div
          className="grid grid-cols-1"
          style={{ rowGap: "var(--ws-1-md, var(--ws-1))" }}
        >
          {pillars.map((p) => {
            const content = pillarContent[p.label];
            return (
              <div
                key={p.label}
                className="grid grid-cols-1 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-6 border-t pt-10 items-start"
                style={{ borderColor: "#2D2928" }}
              >
                <div className="md:col-span-2 md:col-start-1">
                  <p className="font-title">{p.label}</p>
                </div>
                <div className="md:col-span-4 md:col-start-3 flex flex-col h-full">
                  <RevealChildren as="p" className="font-body text-left">{content.intro}</RevealChildren>
                  <a
                    href={`/expertise/${p.slug}`}
                    className="font-body inline-flex items-center gap-2 link-cta text-[#2D2928] mt-6 self-start"
                  >
                    <span className="link-underline">(More)</span>
                    <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="ws-1" />

      <div className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96">
        <hr className="border-0 border-t" style={{ borderColor: "#2D2928" }} />
      </div>

      {/* TALK TO A PRACTICE LEAD */}
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 ws-2 pb-10 md:pb-14 text-center">
        <Appear from="up" delay={60}>
          <p className="font-nav">SO HOW ABOUT IT?</p>
        </Appear>
        <Appear from="up" delay={140}>
          <h2 className="font-hero mt-3 md:mt-4">LET'S TALK</h2>
        </Appear>
      </section>

      <section className="font-body px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-12 items-start">
          {pillars.map((p, i) => (
            <div key={p.label} className={i === 0 ? "md:col-span-1 md:col-start-2" : "md:col-span-1"}>
              <div className="aspect-[4/5] overflow-hidden w-full">
                <img
                  src={p.contact.image}
                  alt={p.contact.name}
                  className="w-full h-full object-cover grayscale"
                />
              </div>
              <p className="font-nav mt-4">{p.label}</p>
              <div className="font-meta mt-4 text-left">
                <p>{p.contact.name}</p>
                <p>{p.contact.role}</p>
                <p>{p.contact.email}</p>
                <p>{p.contact.phone}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ParallaxBanner src={bannerImage} alt="Brigada at work" />
    </article>
  );
};

export default Expertise;