import { useEffect, useId, useMemo, useState } from "react";
import bgImage from "@/assets/quote-bg.jpg";
import {
  duotoneToTintMatrix,
  pickDuotone,
  pickQuadtone,
  quadtoneToTableValues,
  getBrioSettings,
  LUMINANCE_MATRIX,
} from "@/data/duotones";

const IDENTITY_MATRIX = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
const IDENTITY_TABLE = "0 0.25 0.5 0.75 1";

const QuoteBanner = () => {
  const quad = useMemo(() => pickQuadtone(), []);
  const tint = useMemo(() => duotoneToTintMatrix(pickDuotone()), []);

  const [brio, setBrio] = useState(() => getBrioSettings());
  useEffect(() => {
    const onChange = () => setBrio(getBrioSettings());
    window.addEventListener("brio-settings-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("brio-settings-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const tg = brio.toggles;
  const quadTable = useMemo(
    () => (tg.color && quad ? quadtoneToTableValues(quad, 1, brio.thresholds) : null),
    [quad, brio.thresholds, tg.color],
  );

  const rawId = useId().replace(/:/g, "");
  const fid = `inkblot-quote-${rawId}`;

  // Desaturation always on. Pick luminance form when quadtone is in play.
  const desatValues = quad
    ? LUMINANCE_MATRIX
    : "0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0";
  const blurAmt = Math.max(0, Math.min(1, brio.blur));
  const contrastAmt = Math.max(0, Math.min(1, 0));
  const blurStd = String(blurAmt * 32);
  const cScale = 1 + 7 * contrastAmt;
  const cOffset = -3.5 * contrastAmt;
  const contrastValues = `${cScale} 0 0 0 ${cOffset} 0 ${cScale} 0 0 ${cOffset} 0 0 ${cScale} 0 ${cOffset} 0 0 0 1 0`;
  const warpAmt = Math.max(0, Math.min(2, 0));
  const warpScale = String(warpAmt * 16);

  const tintValues = `${tint.rScale} 0 0 0 ${tint.rOffset} 0 ${tint.gScale} 0 0 ${tint.gOffset} 0 0 ${tint.bScale} 0 ${tint.bOffset} 0 0 0 1 0`;
  const finalTintValues = !tg.color || quad ? IDENTITY_MATRIX : tintValues;

  return (
    <section className="relative w-full bg-[#f3f2ef] px-6 md:px-10 py-16 md:py-24">
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
            <feColorMatrix
              in="SourceGraphic"
              type="matrix"
              values={desatValues}
              result="gray"
            />
            <feColorMatrix
              in="gray"
              type="matrix"
              values={contrastValues}
              result="contrast"
            />
            <feGaussianBlur in="contrast" stdDeviation={blurStd} result="blurred" />
            <feColorMatrix in="blurred" type="matrix" values={finalTintValues} result="tinted" />
            <feComponentTransfer in="tinted" result="mapped">
              <feFuncR type="table" tableValues={quadTable?.r ?? IDENTITY_TABLE} />
              <feFuncG type="table" tableValues={quadTable?.g ?? IDENTITY_TABLE} />
              <feFuncB type="table" tableValues={quadTable?.b ?? IDENTITY_TABLE} />
            </feComponentTransfer>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.6"
              numOctaves="1"
              seed="4"
              result="noise"
            />
            <feDisplacementMap
              in="mapped"
              in2="noise"
              scale={warpScale}
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced"
            />
          </filter>
        </defs>
      </svg>

      <div className="relative w-full overflow-hidden aspect-[16/9] md:aspect-[21/9] bg-[#2D2928]">
        <img
          src={bgImage}
          alt=""
          aria-hidden
          loading="lazy"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: `url(#${fid})`,
            transform: "scale(1.15)",
            transformOrigin: "center center",
            willChange: "filter, transform",
          }}
        />

        <div className="relative h-full w-full flex items-center">
          <div className="px-8 md:px-16 max-w-5xl">
            <blockquote
              className="text-3xl md:text-5xl lg:text-6xl leading-tight tracking-tight text-[#f3f2ef]"
              style={{ fontFamily: "'Antarctica', system-ui, sans-serif", fontWeight: 400 }}
            >
              &ldquo;Great work begins where the brief ends, in the space between ambition and craft.&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-xs uppercase tracking-widest text-[#f3f2ef]/70">
              Naranja Studio
            </figcaption>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuoteBanner;
