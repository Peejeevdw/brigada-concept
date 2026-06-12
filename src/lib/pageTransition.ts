// Tiny module store that exposes the page-transition crossfade so elements
// rendered OUTSIDE the faded subtree (e.g. the persistent service tab bar) can
// still trigger it. PageTransitionProvider registers its `transitionTo` here on
// mount; everything inside the provider keeps using the React context as before.
//
// Mirrors the store-style approach already used by servicesTransition.ts.

type TransitionFn = (to: string) => void;

let current: TransitionFn | null = null;

// Called by PageTransitionProvider to publish its crossfade trigger.
export function registerPageTransition(fn: TransitionFn): void {
  current = fn;
}

// Trigger the crossfade navigation from anywhere. Falls back to a hard location
// change if the provider hasn't registered yet (it always should, in practice).
export function runPageTransition(to: string): void {
  if (current) current(to);
  else if (typeof window !== "undefined") window.location.assign(to);
}
