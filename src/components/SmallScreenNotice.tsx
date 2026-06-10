"use client";

import { usePathname } from "next/navigation";

// Full-screen notice shown on viewports narrower than 1240px. The mobile
// layout is still being fine-tuned, so below the breakpoint we cover the site
// entirely and ask visitors to switch to a larger screen.
//
// Pages that are already mobile-ready opt out (see EXEMPT_PREFIXES). The
// show/hide is still pure CSS (Tailwind `max-[…]` variant); usePathname is
// SSR-consistent in the app router, so no hydration flicker.
const EXEMPT_PREFIXES = ["/press"];

export default function SmallScreenNotice() {
  const pathname = usePathname();
  if (pathname && EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    return null;
  }
  return (
    <div
      className="fixed inset-0 z-[9999] hidden flex-col items-center justify-center gap-6 bg-brigada-black px-8 text-center text-white max-[1239.98px]:flex"
      style={{ fontFamily: '"Antarctica", system-ui, sans-serif' }}
      role="alert"
    >
      <p
        className="uppercase leading-none"
        style={{ fontWeight: 500, fontStretch: "125%", fontSize: "clamp(22px,7vw,32px)" }}
      >
        Brigada
      </p>
      <p
        className="max-w-[32ch] leading-[1.3]"
        style={{ fontWeight: 400, fontSize: "clamp(18px,5vw,24px)" }}
      >
        Bekijk deze site op een groter scherm.
      </p>
      <p
        className="max-w-[34ch] leading-[1.5] text-white/60"
        style={{ fontWeight: 400, fontSize: "clamp(14px,3.5vw,16px)" }}
      >
        De mobiele versie wordt momenteel nog gefinetuned.
      </p>
    </div>
  );
}
