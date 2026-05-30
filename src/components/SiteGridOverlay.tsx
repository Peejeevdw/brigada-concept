import { useEffect, useState } from "react";

/**
 * Toggleable 6-column grid overlay for design QA.
 * Press Shift+G anywhere (outside inputs) to toggle.
 * Mirrors the site grid: px-6 md:px-10 outer padding, gap-3 md:gap-5 gutters.
 * Also draws blue vertical lines at the edges of the navbar items.
 */
const SiteGridOverlay = () => {
  const [visible, setVisible] = useState(false);
  const [navEdges, setNavEdges] = useState<number[]>([]);
  const [navCenters, setNavCenters] = useState<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "G") return;
      if (!e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      setVisible((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const measure = () => {
      const nav = document.querySelector("header nav");
      if (!nav) {
        setNavEdges([]);
        setNavCenters([]);
        return;
      }
      const items = Array.from(nav.children) as HTMLElement[];
      const edges: number[] = [];
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        edges.push(r.left, r.right);
      });
      setNavEdges(edges);
      // Middle 4 nav items = indices 1..4 (Expertise, Work, About, Careers).
      const centers: number[] = [];
      for (let i = 1; i <= 4; i++) {
        const el = items[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        centers.push(r.left + r.width / 2);
      }
      setNavCenters(centers);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    const id = window.setInterval(measure, 500);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      window.clearInterval(id);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96"
        style={{ zIndex: 2147483647 }}
      >
        <div className="grid h-full grid-cols-6 gap-3 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-full"
              style={{
                backgroundColor: "hsl(0 100% 50% / 0.15)",
                borderLeft: "1px solid hsl(0 100% 50% / 0.5)",
                borderRight: "1px solid hsl(0 100% 50% / 0.5)",
              }}
            />
          ))}
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: 2147483647 }}
      >
        {navEdges.map((x, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: x,
              width: 1,
              backgroundColor: "hsl(220 100% 50% / 0.7)",
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "50%",
            width: 1,
            backgroundColor: "hsl(140 80% 40% / 0.8)",
          }}
        />
        {navCenters.map((x, i) => (
          <div
            key={`c-${i}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: x,
              width: 1,
              backgroundColor: "hsl(140 80% 40% / 0.8)",
            }}
          />
        ))}
      </div>
    </>
  );
};

export default SiteGridOverlay;
