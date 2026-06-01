import { useEffect, type RefObject } from "react";

// Osmo Supply "Directional List Hover" — ported to React. The direction-
// detection logic (directionMap + getDirection) is kept exactly as shipped; only
// the lifecycle is adapted: it scopes to a container ref and attaches/cleans up
// listeners instead of running once on DOMContentLoaded. The [data-*] hooks and
// the tile's base CSS (in index.css) are unchanged.
//
// Markup contract (unchanged from the resource):
//   container  → [data-directional-hover] [data-type="y|x|all"]
//   each item  → [data-directional-hover-item]
//   each tile  → [data-directional-hover-tile] (inside its item)

const directionMap: Record<string, string> = {
  top: "translateY(-100%)",
  bottom: "translateY(100%)",
  left: "translateX(-100%)",
  right: "translateX(100%)",
};

function getDirection(event: MouseEvent, el: HTMLElement, type: string) {
  const { left, top, width: w, height: h } = el.getBoundingClientRect();
  const x = event.clientX - left;
  const y = event.clientY - top;

  if (type === "y") return y < h / 2 ? "top" : "bottom";
  if (type === "x") return x < w / 2 ? "left" : "right";

  const distances = { top: y, right: w - x, bottom: h - y, left: x };
  return Object.entries(distances).reduce((a, b) => (a[1] < b[1] ? a : b))[0];
}

export function useDirectionalHover(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    const type = container.getAttribute("data-type") || "all";

    const cleanups: Array<() => void> = [];
    container.querySelectorAll<HTMLElement>("[data-directional-hover-item]").forEach((item) => {
      const tile = item.querySelector<HTMLElement>("[data-directional-hover-tile]");
      if (!tile) return;

      const onEnter = (e: MouseEvent) => {
        const dir = getDirection(e, item, type);
        tile.style.transition = "none";
        tile.style.transform = directionMap[dir] || "translate(0, 0)";
        void tile.offsetHeight;
        tile.style.transition = "";
        tile.style.transform = "translate(0%, 0%)";
        item.setAttribute("data-status", `enter-${dir}`);
      };
      const onLeave = (e: MouseEvent) => {
        const dir = getDirection(e, item, type);
        item.setAttribute("data-status", `leave-${dir}`);
        tile.style.transform = directionMap[dir] || "translate(0, 0)";
      };

      item.addEventListener("mouseenter", onEnter);
      item.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        item.removeEventListener("mouseenter", onEnter);
        item.removeEventListener("mouseleave", onLeave);
      });
    });

    return () => cleanups.forEach((fn) => fn());
  }, [ref]);
}
