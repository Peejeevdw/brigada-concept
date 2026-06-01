import { useEffect, useRef, useState } from "react";

// Osmo Supply — "Refracted Glass (Unicorn Studio)". The WebGL composition
// (data-us-* attributes kept exactly as shipped) renders on top of the photo;
// hovering fades the effect out to reveal the clean portrait underneath.
//
// The clean image below is the SAME demo portrait baked into the composition
// (pulled from the JSON's image src), so the refracted effect and the revealed
// photo are the same person. Swap all three constants for a custom export.

const UNICORN_SCRIPT_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.0/dist/unicornStudio.umd.js";
const REFRACT_JSON_SRC =
  "https://osmo.b-cdn.net/resource-media/osmo-unicorn-refracted-glass-v2.json";
const REFRACT_IMAGE_SRC =
  "https://assets.unicorn.studio/images/GzH1Weq9sLcIDox0LImBLFdxLIn1/Ethereal%20Portrait.webp";
const REFRACT_ALT = "Dreamy portrait of a woman in motion";

type UnicornScene = { destroy?: () => void };
declare global {
  interface Window {
    UnicornStudio?: { init: () => Promise<UnicornScene[]>; destroy?: () => void };
  }
}

// Load the Unicorn Studio UMD script once (shared across mounts).
const loadUnicornScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.UnicornStudio) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${UNICORN_SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("unicorn load")));
      return;
    }
    const script = document.createElement("script");
    script.src = UNICORN_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("unicorn load"));
    document.head.appendChild(script);
  });

const BrandRefractPhoto = () => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let scenes: UnicornScene[] | undefined;
    loadUnicornScript()
      .then(() => {
        if (cancelled || !window.UnicornStudio) return undefined;
        return window.UnicornStudio.init();
      })
      .then((s) => {
        scenes = s;
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
      scenes?.forEach((scene) => scene.destroy?.());
    };
  }, []);

  return (
    <div
      className="relative aspect-[262/362] w-full overflow-hidden"
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {/* Clean portrait underneath — revealed on hover */}
      <img
        src={REFRACT_IMAGE_SRC}
        alt={REFRACT_ALT}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Unicorn Studio refracted-glass effect on top; fades out on hover */}
      <div
        ref={itemRef}
        data-us-alttext={REFRACT_ALT}
        data-us-project-src={REFRACT_JSON_SRC}
        data-us-scale="1"
        data-us-dpi="1"
        data-us-lazyload="false"
        data-us-production="true"
        className="absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ opacity: hover ? 0 : 1 }}
      />
    </div>
  );
};

export default BrandRefractPhoto;
