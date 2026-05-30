import { useCallback, useEffect, useRef, useState } from "react";
import type { BrioThresholds } from "@/data/duotones";

/**
 * Single horizontal track with 6 draggable handles defining 4 solid color
 * bands separated by 3 gradient transition bands:
 *
 *   color 1: 0       to t[0]            (solid)
 *   trans:   t[0]    to t[1]            (color1 -> color2)
 *   color 2: t[1]    to t[2]            (solid)
 *   trans:   t[2]    to t[3]            (color2 -> color3)
 *   color 3: t[3]    to t[4]            (solid)
 *   trans:   t[4]    to t[5]            (color3 -> color4)
 *   color 4: t[5]    to 1               (solid)
 *
 * Color 1 always starts at 0. Color 4 always ends at 1.
 */
type Props = {
  values: BrioThresholds;
  colors: [string, string, string, string];
  onChange: (next: BrioThresholds) => void;
};

const BrioRangeSlider = ({ values, colors, onChange }: Props) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  // handleIdx is 0..5 (index in the thresholds array). Each handle is
  // clamped between its neighbors so the array stays ascending.
  const updateFromClientX = useCallback(
    (handleIdx: number, clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const raw = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, raw));
      const lo = handleIdx === 0 ? 0 : values[handleIdx - 1];
      const hi = handleIdx === 5 ? 1 : values[handleIdx + 1];
      const v = Math.max(lo, Math.min(hi, clamped));
      const next = [...values] as BrioThresholds;
      next[handleIdx] = v;
      onChange(next);
    },
    [values, onChange],
  );

  useEffect(() => {
    if (dragging == null) return;
    const onMove = (e: PointerEvent) => updateFromClientX(dragging, e.clientX);
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, updateFromClientX]);

  // 7 segments: solid, gradient, solid, gradient, solid, gradient, solid.
  const segments = [
    { left: 0, right: values[0], background: colors[0] },
    {
      left: values[0],
      right: values[1],
      background: `linear-gradient(to right, ${colors[0]}, ${colors[1]})`,
    },
    { left: values[1], right: values[2], background: colors[1] },
    {
      left: values[2],
      right: values[3],
      background: `linear-gradient(to right, ${colors[1]}, ${colors[2]})`,
    },
    { left: values[3], right: values[4], background: colors[2] },
    {
      left: values[4],
      right: values[5],
      background: `linear-gradient(to right, ${colors[2]}, ${colors[3]})`,
    },
    { left: values[5], right: 1, background: colors[3] },
  ];

  const handles = [0, 1, 2, 3, 4, 5] as const;

  return (
    <div className="select-none">
      <div
        ref={trackRef}
        className="relative h-8 w-full rounded-sm border border-[#2D2928]/30 overflow-hidden"
      >
        {segments.map((s, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${s.left * 100}%`,
              width: `${Math.max(0, s.right - s.left) * 100}%`,
              background: s.background,
            }}
          />
        ))}

        {handles.map((idx) => (
          <div
            key={idx}
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              setDragging(idx);
              updateFromClientX(idx, e.clientX);
            }}
            className="absolute top-1/2 -translate-y-1/2 h-10 w-3 -ml-[6px] border-2 border-[#2D2928] bg-[#f3f2ef] cursor-ew-resize"
            style={{ left: `${values[idx] * 100}%` }}
            title={`Handle ${idx + 1}: ${values[idx].toFixed(2)}`}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-6 gap-1 text-[10px] font-mono opacity-70">
        {handles.map((idx) => (
          <span key={idx} className="text-center">
            H{idx + 1}: {values[idx].toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default BrioRangeSlider;
