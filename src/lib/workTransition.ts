import { useSyncExternalStore } from "react";

export type WorkTransitionPhase =
  | "idle"
  | "holding"
  | "moving"
  | "growing"
  | "revealing"
  | "done";

export interface WorkTransitionState {
  phase: WorkTransitionPhase;
  slug: string | null;
  imageSrc: string | null;
  sourceRect: { left: number; top: number; width: number; height: number } | null;
  targetRect: { left: number; top: number; width: number; height: number } | null;
  direct: boolean;
}

const initial: WorkTransitionState = {
  phase: "idle",
  slug: null,
  imageSrc: null,
  sourceRect: null,
  targetRect: null,
  direct: false,
};

let state: WorkTransitionState = initial;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const workTransition = {
  get: () => state,
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  start: (payload: {
    slug: string;
    imageSrc: string;
    sourceRect: { left: number; top: number; width: number; height: number };
    direct?: boolean;
  }) => {
    state = {
      phase: "holding",
      slug: payload.slug,
      imageSrc: payload.imageSrc,
      sourceRect: payload.sourceRect,
      targetRect: null,
      direct: payload.direct ?? false,
    };
    emit();
  },
  setTargetRect: (
    rect: { left: number; top: number; width: number; height: number },
  ) => {
    if (state.phase !== "moving" && state.phase !== "holding") return;
    state = { ...state, targetRect: rect };
    emit();
  },
  setPhase: (phase: WorkTransitionPhase) => {
    state = { ...state, phase };
    emit();
  },
  reset: () => {
    state = initial;
    emit();
  },
};

export const useWorkTransition = () =>
  useSyncExternalStore(
    workTransition.subscribe,
    workTransition.get,
    workTransition.get,
  );
