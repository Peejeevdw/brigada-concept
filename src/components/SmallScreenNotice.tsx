// Full-screen notice shown on viewports narrower than 1240px. The mobile
// layout is still being fine-tuned, so below the breakpoint we cover the site
// entirely and ask visitors to switch to a larger screen.
//
// Pure CSS (Tailwind `max-[…]` variant): hidden by default, flex below 1240px.
// No JS / media-query hook → no hydration flicker, works during SSR.
export default function SmallScreenNotice() {
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
