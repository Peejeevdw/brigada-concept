import { useId, useMemo } from "react";
import { duotoneToTintMatrix, pickDuotone } from "@/data/duotones";

const seedUrl = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

const FooterImage = () => {
  const rawId = useId().replace(/:/g, "");
  const fid = `inkblot-footer-${rawId}`;

  const tint = useMemo(() => duotoneToTintMatrix(pickDuotone()), []);

  // Fully-on values matching Hero at p = 1.
  const desatValues =
    "0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0";
  const c = 8;
  const o = -3.5;
  const contrastValues = `${c} 0 0 0 ${o} 0 ${c} 0 0 ${o} 0 0 ${c} 0 ${o} 0 0 0 1 0`;
  const tintValues = `${tint.rScale} 0 0 0 ${tint.rOffset} 0 ${tint.gScale} 0 0 ${tint.gOffset} 0 0 ${tint.bScale} 0 ${tint.bOffset} 0 0 0 1 0`;

  return (
    <section className="relative bg-[#f3f2ef]" style={{ height: "200vh" }}>
      <div className="sticky top-0 h-screen w-full px-6 md:px-10 py-6 md:py-10">
        <svg className="absolute -z-10 w-0 h-0" aria-hidden>
          <defs>
            <filter
              id={fid}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
              colorInterpolationFilters="sRGB"
            >
              <feColorMatrix in="SourceGraphic" type="matrix" values={desatValues} result="gray" />
              <feColorMatrix in="gray" type="matrix" values={contrastValues} result="contrast" />
              <feGaussianBlur in="contrast" stdDeviation="8" result="blurred" />
              <feColorMatrix in="blurred" type="matrix" values={tintValues} result="tinted" />
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="4" result="noise" />
              <feDisplacementMap
                in="tinted"
                in2="noise"
                scale="8"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
            </filter>
          </defs>
        </svg>

        <div className="grid grid-cols-6 gap-3 md:gap-5 h-full">
          <div className="col-span-2 h-full flex items-start">
            <div className="w-full aspect-square overflow-hidden">
              <img
                src={seedUrl("project-alpha", 1200, 1200)}
                alt="Selected case visual"
                loading="lazy"
                className="w-full h-full object-cover rounded-sm"
              />
            </div>
          </div>
          <div className="col-span-4 h-full flex items-start">
            <div className="relative w-full aspect-[3/2] overflow-hidden rounded-sm">
              <img
                src={seedUrl("telenet", 1800, 1200)}
                alt="Selected case visual"
                loading="lazy"
                crossOrigin="anonymous"
                className="w-full h-full object-cover"
                style={{ filter: `url(#${fid})` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  opacity: 0.18,
                  mixBlendMode: "multiply",
                  backgroundImage:
                    "radial-gradient(rgba(0,0,0,0.9) 1px, transparent 1px)",
                  backgroundSize: "3px 3px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FooterImage;
