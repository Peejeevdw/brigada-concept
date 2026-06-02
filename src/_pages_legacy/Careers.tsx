import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import Appear from "@/components/Appear";
import RevealChildren from "@/components/RevealChildren";
import ScrollPhysicsGroup from "@/components/ScrollPhysicsGroup";
import ParallaxBanner from "@/components/home-v4-v2/ParallaxBanner";
import FootageColorsSequence from "@/components/FootageColorsSequence";
import { jobs } from "@/data/jobs";
import careers1 from "@/assets/careers/careers-1.jpg";
import careers2 from "@/assets/careers/careers-2.jpg";
import careers3 from "@/assets/careers/careers-3.jpg";
import careers4 from "@/assets/careers/careers-4.jpg";
import careers5 from "@/assets/careers/careers-5.jpg";
import bannerImage from "@/assets/careers/careers-parallax.png";

const collageImages = [
  { src: careers1, className: "left-0 -top-24 w-[calc((100%-1.25rem)/4)] aspect-[3/4]" },
  { src: careers2, className: "left-[calc((2*100%+2*1.25rem)/3)] -translate-x-full -top-12 w-[calc((100%-1.25rem)/4)] aspect-square" },
  { src: careers3, className: "left-[24%] top-24 w-[calc((100%-1.25rem)/4)] aspect-[3/4]" },
  { src: careers5, className: "right-0 -top-28 w-[calc((100%-1.25rem)/4)] aspect-[3/4]" },
  { src: careers4, className: "left-[calc(62%-0.09375rem)] top-[calc(5%+5.9375rem)] w-[calc(20%-0.21875rem)] aspect-[3/4]" },
];

const jobBlurb =
  "As a Senior Client Manager you will be responsible for leading and delivering complex client projects and mid-size accounts; creating clarity, consistency and momentum while growing your commercial and strategic impact.";

const HERO_SEQUENCE_SOURCES = [careers1, careers2, careers3, careers4, careers5];
// Seconds spent on each frame before wiping to the next.
const HERO_CYCLE_SECONDS = 5;

const Careers = () => {
  const progressRef = useRef(0);
  // Append the first image so the wipe goes last -> first, then loops cleanly.
  const sequenceSources = useMemo(
    () => [...HERO_SEQUENCE_SOURCES, HERO_SEQUENCE_SOURCES[0]],
    [],
  );

  // Auto-cycle the sequence progress so the wipe animates without scroll.
  useEffect(() => {
    const segments = HERO_SEQUENCE_SOURCES.length; // number of wipes per loop
    if (segments < 1) return;
    let raf = 0;
    const start = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000;
      const cycle = HERO_CYCLE_SECONDS * segments;
      progressRef.current = (elapsed % cycle) / HERO_CYCLE_SECONDS;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);


  return (
    <article className="bg-[#f3f2ef]" style={{ color: "#2D2928" }}>
      {/* HERO: text overlay on top of the footage-colors sequence background. */}
      <section className="relative w-full h-[66.6667vh]" style={{ zIndex: 50 }}>
        <div className="absolute inset-x-0 top-0 h-[calc(66.6667vh-3rem+(100vw-3rem-1.25rem)/4)] md:h-[calc(66.6667vh-3rem+(100vw-5rem-1.25rem)/4)] xl:h-[calc(66.6667vh-3rem+(100vw-12rem-1.25rem)/4)] 2xl:h-[calc(66.6667vh-3rem+(100vw-24rem-1.25rem)/4)] min-[1800px]:h-[calc(66.6667vh-3rem+(100vw-36rem-1.25rem)/4)] min-[2400px]:h-[calc(66.6667vh-3rem+(100vw-48rem-1.25rem)/4)] overflow-hidden bg-[#2D2928]">
          {sequenceSources.length > 0 && (
            <FootageColorsSequence sources={sequenceSources} progressRef={progressRef} />
          )}
          <div className="absolute inset-0 bg-brigada-black/25 pointer-events-none" />
        </div>
        <div className="relative z-10 h-full px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 text-white flex flex-col items-center justify-center text-center">
          <Appear from="up" delay={60}>
            <p className="font-nav text-white/90">CAREERS</p>
          </Appear>
          <Appear from="up" delay={140}>
            <h1 className="font-hero mt-3 md:mt-4">
              BABY MAKE YOUR MOVE
            </h1>
          </Appear>
          <Appear from="up" delay={240}>
            <p className="font-meta mt-4 md:mt-5 mx-auto max-w-xl text-white/90">
              We think for ourselves. We want to keep learning and pushing for better, even after a substantial lunch. We make the hard choices and say what needs to be said. Sounds like you, too? Then we're off to a great start.
            </p>
          </Appear>
        </div>
      </section>

      {/* COLLAGE: 5 images overlapping the hero into the page */}
      <section className="relative h-[60vh] md:h-[70vh] px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96" style={{ zIndex: 50 }}>
        <ScrollPhysicsGroup>
          {collageImages.map((img, i) => (
            <Appear key={i} from="up" delay={80 + i * 80}>
              <div className={`absolute overflow-hidden ${img.className}`}>
                <img src={img.src} alt="" className="w-full h-full object-cover" />
              </div>
            </Appear>
          ))}
        </ScrollPhysicsGroup>
      </section>

      {/* OPEN POSITIONS */}
      <section className="px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 pb-24">
        <Appear from="up" delay={60}>
          <p className="font-nav">OPEN POSITIONS</p>
        </Appear>

        <div className="mt-6 border-t" style={{ borderColor: "#2D2928" }}>
          {jobs.map((j) => (
            <div
              key={j.slug}
              className="grid grid-cols-1 md:grid-cols-6 gap-x-3 md:gap-x-5 gap-y-4 border-b last:border-b-0 py-10 items-start"
              style={{ borderColor: "#2D2928" }}
            >
              <div className="md:col-span-2">
                <Link to={`/careers/jobs/${j.slug}`} className="group inline-block">
                  <p className="font-title uppercase group-hover:underline underline-offset-4">
                    {j.title}
                  </p>
                </Link>
              </div>
              <div className="md:col-span-3 md:col-start-4">
                <RevealChildren as="p" className="font-body text-left">
                  {jobBlurb}
                </RevealChildren>
              </div>
            </div>
          ))}
        </div>
      </section>


      <ParallaxBanner src={bannerImage} alt="Brigada at work" />
    </article>
  );
};

export default Careers;
