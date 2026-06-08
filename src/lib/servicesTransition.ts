import { useSyncExternalStore } from "react";
import type { Pillar } from "@/components/wireframe/WorkThumb";

export type ServicesTransitionPhase =
  | "idle"
  | "sliding"
  | "fading"
  | "settling";

export interface ServicesTransitionState {
  phase: ServicesTransitionPhase;
  pillar: Pillar | null;
  slug: string | null;
  intro: string | null;
}

const initial: ServicesTransitionState = {
  phase: "idle",
  pillar: null,
  slug: null,
  intro: null,
};

let state: ServicesTransitionState = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const servicesTransition = {
  get: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  start: (payload: { pillar: Pillar; slug: string; intro: string }) => {
    state = {
      phase: "sliding",
      pillar: payload.pillar,
      slug: payload.slug,
      intro: payload.intro,
    };
    emit();
  },
  setPhase: (phase: ServicesTransitionPhase) => {
    state = { ...state, phase };
    emit();
  },
  reset: () => {
    state = initial;
    emit();
  },
};

export const useServicesTransition = () =>
  useSyncExternalStore(
    servicesTransition.subscribe,
    servicesTransition.get,
    servicesTransition.get,
  );

// Timing constants (ms)
export const SERVICES_SLIDE_MS = 600;
export const SERVICES_FADE_MS = 320;
