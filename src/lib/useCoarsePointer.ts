"use client";

import { useEffect, useState } from "react";

// True on touch / coarse-pointer devices (phones, tablets). Use it to disable
// hover-only affordances and cursor-follower effects that are dead weight — or
// outright broken — without a mouse. SSR-safe: starts `false`, resolves after
// mount via matchMedia (and updates if the pointer type changes, e.g. a tablet
// switching between touch and a paired trackpad).
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return coarse;
}
