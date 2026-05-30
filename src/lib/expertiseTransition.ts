import { useSyncExternalStore } from "react";
import type { Pillar } from "@/components/wireframe/WorkThumb";

export type ExpertiseTransitionPhase =
  | "idle"
  | "sliding"
  | "fading"
  | "settling";

export interface ExpertiseTransitionState {
  phase: ExpertiseTransitionPhase;
  pillar: Pillar | null;
  slug: string | null;
  intro: string | null;
}

const initial: ExpertiseTransitionState = {
  phase: "idle",
  pillar: null,
  slug: null,
  intro: null,
};

let state: ExpertiseTransitionState = initial;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const expertiseTransition = {
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
  setPhase: (phase: ExpertiseTransitionPhase) => {
    state = { ...state, phase };
    emit();
  },
  reset: () => {
    state = initial;
    emit();
  },
};

export const useExpertiseTransition = () =>
  useSyncExternalStore(
    expertiseTransition.subscribe,
    expertiseTransition.get,
    expertiseTransition.get,
  );

// Timing constants (ms)
export const EXPERTISE_SLIDE_MS = 600;
export const EXPERTISE_FADE_MS = 320;
