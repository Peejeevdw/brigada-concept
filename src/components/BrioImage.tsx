import { useMemo } from "react";
import {
  duotoneToTintMatrix,
  pickDuotone,
  pickQuadtone,
  quadtoneToTableValues,
  getBrioSettings,
} from "@/data/duotones";

interface Props {
  src: string;
  alt?: string;
  className?: string;
  /** Amount of brio effect 0..1, default 1 */
  amount?: number;
  /** Stable seed key so different mounts get different palettes */
  seed?: string;
}

const BrioImage = ({ src, alt = "", className = "", amount = 1, seed }: Props) => {
  const id = useMemo(
    () => `brio-${(seed ?? Math.random().toString(36).slice(2))}`,
    [seed]
  );

  const { tintMatrix, quadTables, blurDev } = useMemo(() => {
    const brio = getBrioSettings();
    const quad = pickQuadtone();
    const tint = duotoneToTintMatrix(pickDuotone());

    const p = amount;
    const lerp = (a: number, b: number) => a + (b - a) * p;

    let tintMatrix: string;
    if (quad) {
      // Quadtone handles color via LUT; tint identity.
      tintMatrix = "1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0";
    } else {
      const r = lerp(1, tint.rScale), rO = lerp(0, tint.rOffset);
      const g = lerp(1, tint.gScale), gO = lerp(0, tint.gOffset);
      const b = lerp(1, tint.bScale), bO = lerp(0, tint.bOffset);
      tintMatrix = `${r} 0 0 0 ${rO} 0 ${g} 0 0 ${gO} 0 0 ${b} 0 ${bO} 0 0 0 1 0`;
    }

    let quadTables = { r: "0 0.25 0.5 0.75 1", g: "0 0.25 0.5 0.75 1", b: "0 0.25 0.5 0.75 1" };
    if (quad) {
      quadTables = quadtoneToTableValues(quad, p, brio.thresholds);
    }

    const blurDev = (brio.blur ?? 0) * 6 * p;

    return { tintMatrix, quadTables, blurDev };
  }, [amount, seed]);

  // Desaturate to luminance ramp at full amount
  const p = amount;
  const lerpDesat = (a: number, b: number) => a + (b - a) * p;
  const r1 = lerpDesat(1, 0.2126), r2 = lerpDesat(0, 0.7152), r3 = lerpDesat(0, 0.0722);
  const g1 = lerpDesat(0, 0.2126), g2 = lerpDesat(1, 0.7152), g3 = lerpDesat(0, 0.0722);
  const b1 = lerpDesat(0, 0.2126), b2 = lerpDesat(0, 0.7152), b3 = lerpDesat(1, 0.0722);
  const desatMatrix = `${r1} ${r2} ${r3} 0 0 ${g1} ${g2} ${g3} 0 0 ${b1} ${b2} ${b3} 0 0 0 0 0 1 0`;

  return (
    <>
      <svg className="absolute -z-10 w-0 h-0" aria-hidden>
        <defs>
          <filter id={id} x="-2%" y="-2%" width="104%" height="104%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values={desatMatrix} result="gray" />
            <feGaussianBlur in="gray" stdDeviation={blurDev} result="blurred" />
            <feColorMatrix in="blurred" type="matrix" values={tintMatrix} result="tinted" />
            <feComponentTransfer in="tinted">
              <feFuncR type="table" tableValues={quadTables.r} />
              <feFuncG type="table" tableValues={quadTables.g} />
              <feFuncB type="table" tableValues={quadTables.b} />
            </feComponentTransfer>
          </filter>
        </defs>
      </svg>
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ filter: `url(#${id})` }}
      />
    </>
  );
};

export default BrioImage;
