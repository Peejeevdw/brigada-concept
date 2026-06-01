import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { BRIGADA_BLACK } from "@/lib/colors";

// Osmo Supply — "Orbit Tiles Infinite Loop". Faithful port: the data-attributes,
// class names and animation math are unchanged from the resource. Only adaptation
// is React lifecycle (useEffect + cleanup) instead of DOMContentLoaded, plus each
// tile is wrapped in a click-ready element (cursor + data-case-slug) so it can
// later link to /brand/:slug — navigation is intentionally NOT wired yet.

gsap.registerPlugin(ScrollTrigger, CustomEase);
CustomEase.create("osmo", "M0,0 C0.625,0.05 0,1 1,1");

// Placeholder cases — swap for real branding cases (+ real slugs) later. A tile
// renders a looping `video` (from /public via BASE_URL) when present, otherwise
// an `img`. To enable navigation: wrap the media in <Link to={`/brand/${c.slug}`}>
// (react-router) or add an onClick → navigate.
// Self-hosted from /public/orbit (was an external Webflow CDN — moved local to
// kill the cold-load stall when the orbit scrolls into view on first visit).
const ORBIT_CASES: { slug: string; img?: string; video?: string }[] = [
  { slug: "case-1", img: `${import.meta.env.BASE_URL}orbit/case-1.avif` },
  { slug: "case-2", img: `${import.meta.env.BASE_URL}orbit/case-2.avif` },
  { slug: "case-3", img: `${import.meta.env.BASE_URL}orbit/case-3.avif` },
  { slug: "case-4", img: `${import.meta.env.BASE_URL}orbit/case-4.avif` },
  { slug: "case-5", img: `${import.meta.env.BASE_URL}orbit/case-5.avif` },
];

// Tunable orbit parameters (Osmo's config, lifted to state so the dev panel can
// adjust them live). linearRotateDuration defaults to 0 = no continuous spin, so
// the tiles move mostly HORIZONTALLY (flat orbit) instead of going all directions.
const DEFAULT_PARAMS = {
  radiusXMultiplier: 1.2, // horizontal orbit size
  radiusYMultiplier: 0.3, // vertical orbit curve (0 = flat / horizontal)
  blurMultiplier: 0.03, // blur strength in the back
  minScale: 0.45, // minimum scale in the back
  minDarkness: 0.4, // minimum brightness in the back (0 = black, 1 = none)
  moveDuration: 3.2, // time between active tiles
  linearRotateDuration: 0, // continuous rotation speed (0 disables)
};
type OrbitParams = typeof DEFAULT_PARAMS;

// Dev-panel slider config (key must match a DEFAULT_PARAMS field).
const ORBIT_SLIDERS: { key: keyof OrbitParams; label: string; min: number; max: number; step: number }[] = [
  { key: "radiusXMultiplier", label: "Horizontal spread", min: 0, max: 3, step: 0.05 },
  { key: "radiusYMultiplier", label: "Vertical curve", min: 0, max: 1, step: 0.05 },
  { key: "blurMultiplier", label: "Back blur", min: 0, max: 0.2, step: 0.005 },
  { key: "minScale", label: "Back scale", min: 0.1, max: 1, step: 0.05 },
  { key: "minDarkness", label: "Back brightness", min: 0, max: 1, step: 0.05 },
  { key: "moveDuration", label: "Move duration", min: 0.5, max: 6, step: 0.1 },
  { key: "linearRotateDuration", label: "Spin (0 = off)", min: 0, max: 40, step: 1 },
];

const BrandOrbit = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<OrbitParams>(DEFAULT_PARAMS);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const list = container.querySelector<HTMLElement>("[data-orbit-tiles-list]");
    const tiles = container.querySelectorAll<HTMLElement>("[data-orbit-tiles-item]");
    const tileCount = tiles.length;
    if (tileCount < 2) return;

    const {
      radiusXMultiplier,
      radiusYMultiplier,
      blurMultiplier,
      minScale,
      minDarkness,
      moveDuration,
      linearRotateDuration,
    } = params;
    const minOpacity = 1;
    const pauseDuration = 0;
    const staggerAmount = moveDuration * 0.03;

    const tileStates = Array.from(tiles, () => ({ progress: 0 }));

    let isActive = false;
    let stepTimeline: gsap.core.Timeline | undefined;
    let delayedCall: gsap.core.Tween | undefined;
    let activeTileIndex = -1;

    function getActiveIndex() {
      return tileStates.reduce((closest, state, index) => {
        const current = Math.min(((index - state.progress) % tileCount + tileCount) % tileCount, tileCount - (((index - state.progress) % tileCount + tileCount) % tileCount));
        const previous = Math.min(((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount, tileCount - (((closest - tileStates[closest].progress) % tileCount + tileCount) % tileCount));
        return current < previous ? index : closest;
      }, 0);
    }

    function updateTileStatus() {
      const currentActiveIndex = getActiveIndex();
      if (currentActiveIndex === activeTileIndex) return;
      activeTileIndex = currentActiveIndex;
      tiles.forEach((tile, index) => {
        tile.setAttribute(
          "data-orbit-tiles-item-status",
          index === activeTileIndex ? "active" : "not-active"
        );
      });
    }

    function renderOrbit() {
      const tileWidth = tiles[0].offsetWidth;
      const radiusX = tileWidth * radiusXMultiplier;
      const radiusY = tileWidth * radiusYMultiplier;
      const maxBlur = tileWidth * blurMultiplier;

      updateTileStatus();

      tiles.forEach((tile, index) => {
        const angle = ((index - tileStates[index].progress) / tileCount) * Math.PI * 2;
        const depth = (Math.cos(angle) + 1) / 2;
        const adjustedDepth = Math.pow(depth, 1.3);

        const scale = gsap.utils.interpolate(minScale, 1, adjustedDepth);
        const opacity = gsap.utils.interpolate(minOpacity, 1, adjustedDepth);
        const blur = gsap.utils.interpolate(maxBlur, 0, adjustedDepth);
        const brightness = gsap.utils.interpolate(minDarkness, 1, adjustedDepth);

        gsap.set(tile, {
          x: Math.sin(angle) * radiusX,
          y: Math.cos(angle) * radiusY,
          scale,
          opacity,
          filter: `blur(${blur}px) brightness(${brightness})`,
          zIndex: Math.round(adjustedDepth * 1000),
        });
      });
    }

    const rotations = !list || linearRotateDuration === 0 ? [] : [
      gsap.to(list, { rotate: 360, duration: linearRotateDuration, ease: "none", repeat: -1, paused: true }),
      gsap.to(tiles, { rotate: -360, duration: linearRotateDuration, ease: "none", repeat: -1, paused: true }),
    ];

    function goToNextTile() {
      if (!isActive) return;
      const activeIndex = getActiveIndex();
      const orderedStates = tileStates.map((state, index) => ({ state, offset: (index - activeIndex + tileCount) % tileCount })).sort((a, b) => a.offset - b.offset);

      stepTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
          if (isActive) delayedCall = gsap.delayedCall(pauseDuration, goToNextTile);
        },
      });

      orderedStates.forEach(({ state }, index) => {
        stepTimeline!.to(state, {
          progress: state.progress + 1,
          duration: moveDuration,
          ease: "osmo",
          onUpdate: renderOrbit,
        }, index * staggerAmount);
      });

      stepTimeline.play();
    }

    function pauseOrbit() {
      isActive = false;
      if (stepTimeline) stepTimeline.pause();
      if (delayedCall) delayedCall.pause();
      rotations.forEach((rotation) => rotation.pause());
    }

    function playOrbit() {
      isActive = true;
      rotations.forEach((rotation) => rotation.play());
      if (stepTimeline && stepTimeline.progress() < 1) {
        stepTimeline.play();
      } else {
        goToNextTile();
      }
    }

    renderOrbit();

    let resizeObserver: ResizeObserver | undefined;
    if (pauseDuration > 0) {
      resizeObserver = new ResizeObserver(renderOrbit);
      resizeObserver.observe(container);
    }

    const scrollTrigger = ScrollTrigger.create({
      trigger: container,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => (self.isActive ? playOrbit() : pauseOrbit()),
    });

    // React cleanup — kill everything the Osmo init created and clear the
    // rotation transform so re-init (e.g. dev-panel changes) starts clean.
    return () => {
      isActive = false;
      scrollTrigger.kill();
      rotations.forEach((rotation) => rotation.kill());
      if (stepTimeline) stepTimeline.kill();
      if (delayedCall) delayedCall.kill();
      resizeObserver?.disconnect();
      if (list) gsap.set(list, { rotate: 0 });
      gsap.set(tiles, { rotate: 0 });
    };
  }, [params]);

  return (
    <section ref={containerRef} data-orbit-tiles-init className="orbit-tiles">
      <style>{`
        .orbit-tiles { justify-content: center; align-items: center; width: 100%; height: 900px; padding-bottom: 120px; display: flex; position: relative; overflow: clip; background-color: ${BRIGADA_BLACK}; }
        .orbit-tiles__collection { justify-content: center; align-items: center; display: flex; position: relative; }
        .orbit-tiles__list { place-items: center; display: grid; }
        .orbit-tiles__item { will-change: transform, opacity, filter; grid-area: 1 / 1; justify-content: center; align-items: center; width: max-content; height: max-content; display: flex; }
        .demo-card { aspect-ratio: 4 / 3; width: clamp(16em, 25vw, 32em); position: relative; cursor: pointer; }
        .cover-image { object-fit: cover; border-radius: inherit; width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
        .demo-card__label { position: absolute; left: 1em; bottom: 0.85em; z-index: 2; color: #fff; font-size: 0.9em; letter-spacing: -0.01em; pointer-events: none; }
      `}</style>
      <div data-orbit-tiles-collection className="orbit-tiles__collection">
        <div data-orbit-tiles-list className="orbit-tiles__list">
          {ORBIT_CASES.map((c, i) => (
            <div key={c.slug} data-orbit-tiles-item className="orbit-tiles__item">
              {/* Click-ready: data-case-slug + cursor. To navigate later, wrap the
                  <img> in <Link to={`/brand/${c.slug}`}> or add onClick → navigate. */}
              <div className="demo-card" data-case-slug={c.slug} role="link" tabIndex={0}>
                {c.video ? (
                  <video
                    src={c.video}
                    className="cover-image"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden
                  />
                ) : (
                  <img
                    src={c.img}
                    loading="eager"
                    decoding="async"
                    fetchPriority={i === 0 ? "high" : "auto"}
                    alt=""
                    className="cover-image"
                  />
                )}
                {/* Client label — bottom-left under the visual */}
                <span className="demo-card__label">Client name comes here</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dev-only tuning panel — temporarily hidden (set `false &&` → remove to restore) */}
      {false && import.meta.env.DEV && (
        <div
          className="absolute bottom-4 left-4 z-[60] w-[240px] select-none rounded-lg border border-white/15 bg-brigada-black/80 p-3 text-[11px] leading-tight text-white shadow-xl backdrop-blur-md"
          style={{ fontFamily: "ui-monospace, monospace" }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="uppercase tracking-[0.15em] text-white/40">Orbit · dev</span>
            <button
              type="button"
              onClick={() => setParams(DEFAULT_PARAMS)}
              className="text-white/40 underline hover:text-white"
            >
              reset
            </button>
          </div>
          {ORBIT_SLIDERS.map((s) => (
            <label key={s.key} className="mb-2 block">
              {s.label} — {params[s.key].toFixed(s.step < 1 ? 2 : 0)}
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={params[s.key]}
                onChange={(e) =>
                  setParams((p) => ({ ...p, [s.key]: +e.target.value }))
                }
                className="mt-1 w-full accent-white"
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
};

export default BrandOrbit;
