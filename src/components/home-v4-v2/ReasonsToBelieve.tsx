import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Appear from "@/components/Appear";
import RevealText from "@/components/RevealText";
import ScrollUnderline from "@/components/ScrollUnderline";

type Award = {
  year: number;
  show: string;
  category: string;
  client: string;
};

const awards: Award[] = [
  { year: 2026, show: "Cannes Lions", category: "Gold, Film Craft", client: "Volvo" },
  { year: 2025, show: "Webby", category: "Best Visual Design", client: "Patagonia" },
  { year: 2025, show: "FWA", category: "Site of the Day", client: "Bolt" },
  { year: 2024, show: "D&AD", category: "Yellow Pencil, Branding", client: "Lotus Bakeries" },
  { year: 2024, show: "The One Show", category: "Gold Pencil, Design", client: "Delhaize" },
  { year: 2024, show: "Clio", category: "Gold, Integrated Campaign", client: "Proximus" },
  { year: 2023, show: "ADC", category: "Silver Cube, Direction", client: "BNP Paribas Fortis" },
  { year: 2023, show: "Eurobest", category: "Gold, Outdoor", client: "Telenet" },
  { year: 2023, show: "CSS Design Awards", category: "Site of the Day", client: "KBC" },
  { year: 2022, show: "ADCE", category: "Silver, Brand Identity", client: "VRT" },
  { year: 2022, show: "Lovie Awards", category: "Gold, Best Practices", client: "Brussels Airlines" },
  { year: 2021, show: "Awwwards", category: "Honorable Mention", client: "Studio Brussel" },
  { year: 2020, show: "FWA", category: "Site of the Month", client: "Telenet" },
];

const ScrollTypewriter = ({ text, className }: { text: string; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when element top reaches bottom of viewport, 1 when element center reaches viewport center
      const start = vh;
      const end = vh / 2 - rect.height / 2;
      const p = Math.max(0, Math.min(1, (start - rect.top) / (start - end)));
      setCount(Math.floor(p * text.length));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <div ref={ref} className={className}>
      <span>{text.slice(0, count)}</span>
      <span className="opacity-20">{text.slice(count)}</span>
    </div>
  );
};

const ReasonsToBelieve = () => {
  return (
    <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pt-8 md:pt-12 pb-8 md:pb-12 bg-[#f3f2ef] text-[#2D2928]">
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-5 items-start">
        <div className="md:col-span-2">
          <Appear from="up">
            <p className="font-title text-[#2D2928]">
              PROUD, NOT LOUD
            </p>
          </Appear>
        </div>

        <div className="md:col-span-2 font-body text-[#2D2928] text-left flex flex-col gap-8 md:gap-12">
          <div>
            <RevealText as="span" text="When strategy, creativity, data and experience come together from day one, great work happens." className="inline" />
          </div>

          <div className="flex flex-col">
            <Link
              to="/contact"
              className="font-body inline-flex items-center gap-2 link-cta text-[#2D2928]"
            >
              (Contact us)
              <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
            </Link>
            <Link
              to="/work"
              className="font-body inline-flex items-center gap-2 link-cta text-[#2D2928]"
            >
              (All work)
              <ArrowUpRight className="w-5 h-5" strokeWidth={2.5} />
            </Link>
          </div>
        </div>

        <div className="md:col-span-2 font-body text-[#2D2928] text-left flex flex-col gap-8 md:gap-12">
          {Array.from(new Set(awards.map((a) => a.year)))
            .sort((a, b) => b - a)
            .map((year) => {
              const awardsForYear = awards.filter((a) => a.year === year);
              const text = awardsForYear
                .map((a, idx) => {
                  let prefix = `${a.year}. `;
                  if (idx > 0) prefix = "";
                  const show = a.show;
                  return `${prefix}${show}, ${a.category}, for ${a.client}.`;
                })
                .join(" ");
              return (
                <div key={year}>
                  <RevealText as="span" text={text} className="inline" />
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
};

export default ReasonsToBelieve;
