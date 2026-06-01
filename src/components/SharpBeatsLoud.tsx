import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";

// "Sharp beats loud" — gooey word-morph (codrops "WAVE" goo filter).
// Word 1 sharp → letters converge + goo builds → one blob → swap to next word
// (invisible at the blob peak) → letters slide apart + goo melts → sharp. Loops
// through the word list. Defaults are the tuned /sharp-beats settings.
// Honours prefers-reduced-motion (shows the first word static).

const SANS = '"Antarctica", system-ui, sans-serif';

type Props = {
  words?: string[];
  fontSize?: number; // px cap; scales down with viewport
  fontWeight?: number;
  fontWidth?: number; // wdth axis — 150 = Antarctica "Expanded"
  blurMax?: number;
  alphaMul?: number;
  alphaOff?: number;
  lsCollapse?: number; // em — how tightly letters stack into the blob
  convDur?: number;
  holdDur?: number;
  divDur?: number;
  restDur?: number;
  easeIn?: string;
  easeOut?: string;
  filterId?: string;
  className?: string;
  style?: CSSProperties;
};

const SharpBeatsLoud = ({
  words = ["SHARP", "BEATS", "LOUD"],
  fontSize = 180,
  fontWeight = 400,
  fontWidth = 150,
  blurMax = 21,
  alphaMul = 26,
  alphaOff = -10,
  lsCollapse = -0.62,
  convDur = 1.1,
  holdDur = 0.12,
  divDur = 1.3,
  restDur = 0.3,
  easeIn = "power2",
  easeOut = "power4",
  filterId = "sbl-goo",
  className,
  style,
}: Props) => {
  const wordRef = useRef<HTMLSpanElement>(null);
  const feBlurRef = useRef<SVGFEGaussianBlurElement>(null);
  const showing = useRef(0);

  const list = words.map((w) => w.trim()).filter((w) => w.length > 0);
  const wordsKey = list.join("|");

  useLayoutEffect(() => {
    const el = wordRef.current;
    const feBlur = feBlurRef.current;
    if (!el || !feBlur || list.length === 0) return;

    showing.current = 0;
    el.textContent = list[0];

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (reduce) {
      feBlur.setAttribute("stdDeviation", "0");
      el.style.letterSpacing = "0em";
      return;
    }

    el.style.filter = `url(#${filterId})`;
    const v = { blur: 0, ls: 0 };
    const apply = () => {
      feBlur.setAttribute("stdDeviation", String(v.blur));
      el.style.letterSpacing = `${v.ls}em`;
    };
    apply();

    const tl = gsap.timeline({ paused: true, repeat: -1, onUpdate: apply });
    // converge → blob
    tl.to(v, { blur: blurMax, ls: lsCollapse, duration: convDur, ease: `${easeIn}.in` });
    // swap to the next word at the blob peak (invisible — featureless blob)
    tl.add(() => {
      showing.current = (showing.current + 1) % list.length;
      el.textContent = list[showing.current];
    });
    tl.to({}, { duration: holdDur });
    // diverge → sharp
    tl.to(v, { blur: 0, ls: 0, duration: divDur, ease: `${easeOut}.out` });
    tl.to({}, { duration: restDur });
    tl.play();

    return () => {
      tl.kill();
    };
  }, [
    wordsKey, blurMax, lsCollapse, convDur, holdDur, divDur, restDur,
    easeIn, easeOut, filterId, list,
  ]);

  return (
    <div className={className} style={{ fontFamily: SANS, ...style }}>
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <filter id={filterId} x="-50%" y="-100%" width="200%" height="300%">
            <feGaussianBlur ref={feBlurRef} in="SourceGraphic" stdDeviation="0" result="blur" />
            <feColorMatrix
              in="blur" mode="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  1 0 1 0 0  0 0 0 ${alphaMul} ${alphaOff}`}
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
      <span
        ref={wordRef}
        className="select-none whitespace-nowrap text-center uppercase leading-[1.0]"
        style={{
          fontFamily: SANS,
          fontSize: `min(${fontSize}px, ${fontSize / 11}vw)`,
          fontVariationSettings: `"wdth" ${fontWidth}, "wght" ${fontWeight}`,
        }}
      >
        {list[0] ?? ""}
      </span>
    </div>
  );
};

export default SharpBeatsLoud;
