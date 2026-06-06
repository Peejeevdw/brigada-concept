"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Page transition — Osmo "Cross Fade Page Transition", default behaviour, adapted
// for this React Router SPA (Barba.js doesn't fit React, so the *approach* is
// ported, not the library). Osmo crossfades the page itself: the current page
// fades out, the next fades in. Without Barba's dual containers we fade the page
// content out → swap route → fade the new page back in, with Osmo's eases.
//
// Every route is server-rendered on demand (Sanity + draftMode → dynamic), so a
// navigation is a real round-trip, not instant. The fade-in therefore waits for
// the new route to actually COMMIT (useTransition's isPending) instead of a fixed
// frame delay — otherwise we'd fade the stale previous page back in and then snap
// to the new one, which is the flicker. A safety timer guarantees we never stay
// stuck invisible if the pending state misbehaves.

// Hard cap on how long we stay faded-out waiting for a navigation to commit.
const NAV_TIMEOUT_MS = 5000;

const LEAVE_S = 0.3; // current page fades out (power1.in)
const ENTER_S = 0.45; // new page fades in (power1.inOut)

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type TransitionFn = (to: string) => void;
const PageTransitionContext = createContext<TransitionFn>(() => {});

// eslint-disable-next-line react-refresh/only-export-components
export const usePageTransition = () => useContext(PageTransitionContext);

type Phase = "idle" | "leaving" | "entering";

const PageTransitionProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false);
  const pending = useRef<string | null>(null);
  // True between firing router.push and the new route committing (isPending false).
  const awaitingCommit = useRef(false);
  const fallbackTimer = useRef<number | null>(null);

  const transitionTo = useCallback<TransitionFn>(
    (to) => {
      if (busy.current) return;
      if (reduceMotion) {
        router.push(to);
        return;
      }
      busy.current = true;
      pending.current = to;
      setPhase("leaving"); // fade current page out
    },
    [router]
  );

  const clearFallback = () => {
    if (fallbackTimer.current !== null) {
      window.clearTimeout(fallbackTimer.current);
      fallbackTimer.current = null;
    }
  };

  // Reveal the new page once it has committed AND painted. Tying this to the
  // navigation's pending state (not a fixed delay) is what keeps the swap from
  // flickering: we never fade the previous page back in.
  const reveal = useCallback(() => {
    clearFallback();
    awaitingCommit.current = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("entering"));
    });
  }, []);

  // The new route's RSC has been fetched + committed when isPending flips back to
  // false (and the pathname has caught up). Until then the page sits faded-out.
  useEffect(() => {
    if (awaitingCommit.current && !isPending) reveal();
  }, [isPending, pathname, reveal]);

  const handleAnimationComplete = () => {
    if (phase === "leaving") {
      // Current page is gone (opacity 0). Swap the route inside a transition so
      // isPending stays true while Next fetches the new (Sanity-backed) page;
      // the effect above reveals it the moment it commits.
      if (pending.current) {
        const to = pending.current;
        pending.current = null;
        awaitingCommit.current = true;
        startTransition(() => router.push(to));
        // Safety net — never stay invisible if the pending state never resolves.
        clearFallback();
        fallbackTimer.current = window.setTimeout(reveal, NAV_TIMEOUT_MS);
      }
    } else if (phase === "entering") {
      setPhase("idle");
      busy.current = false;
    }
  };

  // Clean up the safety timer on unmount.
  useEffect(() => () => clearFallback(), []);

  return (
    <PageTransitionContext.Provider value={transitionTo}>
      <motion.div
        initial={false}
        animate={{ opacity: phase === "leaving" ? 0 : 1 }}
        transition={{
          duration: phase === "leaving" ? LEAVE_S : ENTER_S,
          ease: phase === "leaving" ? "easeIn" : "easeInOut",
        }}
        onAnimationComplete={handleAnimationComplete}
        style={{ pointerEvents: phase === "idle" ? "auto" : "none" }}
      >
        {children}
      </motion.div>
    </PageTransitionContext.Provider>
  );
};

export default PageTransitionProvider;
