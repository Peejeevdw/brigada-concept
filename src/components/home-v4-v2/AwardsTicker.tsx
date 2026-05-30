import { useEffect, useRef } from "react";
import Appear from "@/components/Appear";

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

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];

const AwardsTicker = () => {
  const grouped: Array<[number, Award[]]> = YEARS.map((y) => [
    y,
    awards.filter((a) => a.year === y),
  ]);

  const sectionRef = useRef<HTMLElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const scroller = scrollerRef.current;
    if (!section || !scroller) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = section.offsetHeight - vh;
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 0));
      const progress = total > 0 ? scrolled / total : 0;

      const maxX = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollLeft = progress * maxX;
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
  }, []);

  return (
    <section
      ref={sectionRef}
      className="bg-[#f3f2ef] text-[#2D2928] relative"
      style={{ height: "300vh" }}
    >
      <Appear from="up" duration={900} className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden">
        <div className="w-full px-6 md:px-10">
          <div className="relative h-[55vh] min-h-[400px]">
            <div
              ref={scrollerRef}
              className="flex gap-px h-full items-start w-full overflow-hidden"
            >
              {grouped.map(([year, list]) => (
                <article
                  key={year}
                  className="shrink-0 w-[80vw] md:w-[calc((100vw-6rem)/3)] flex flex-col pr-8 md:pr-12 pt-0"
                >
                  <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#2D2928]">
                    <span className="text-xs uppercase tracking-widest font-bold tabular-nums text-[#2D2928]">
                      {year}
                    </span>
                  </div>
                  <div className="px-1">
                    {list.length === 0 ? (
                      <p className="text-xs uppercase tracking-widest text-[#2D2928]/40">
                        No entries
                      </p>
                    ) : (
                      <ul className="space-y-8">
                        {list.map((a, i) => (
                          <li key={i} className="flex flex-col gap-2">
                            <span className="text-xs uppercase tracking-widest opacity-60">
                              {a.show}
                            </span>
                            <span className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
                              {a.category}
                            </span>
                            <span className="text-xs uppercase tracking-widest opacity-60">
                              For {a.client}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Appear>
    </section>
  );
};

export default AwardsTicker;
