"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Page transition — Osmo "Cross Fade Page Transition", default behaviour, adapted
// for this React Router SPA (Barba.js doesn't fit React, so the *approach* is
// ported, not the library). Osmo crossfades the page itself: the current page
// fades out, the next fades in. Without Barba's dual containers we fade the page
// content out → swap route → fade the new page back in, with Osmo's eases.

const LEAVE_S = 0.5; // current page fades out (power1.in)
const ENTER_S = 0.75; // new page fades in (power1.inOut)

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
  const [phase, setPhase] = useState<Phase>("idle");
  const busy = useRef(false);
  const pending = useRef<string | null>(null);

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

  const handleAnimationComplete = () => {
    if (phase === "leaving") {
      // Current page is gone — swap the route, then fade the new page in.
      if (pending.current) {
        router.push(pending.current);
        pending.current = null;
      }
      setPhase("entering");
    } else if (phase === "entering") {
      setPhase("idle");
      busy.current = false;
    }
  };

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
