## What is likely happening
The hero is still sometimes wrong because its layout is being computed from live measurements while assets are still settling.

In `src/components/home-v4-v2/Hero.tsx`, the hero measures text and viewport geometry to set:
- `--wmFs` for the large wordmark size
- `--sblTy` for the SBL vertical position
- the section height for the pin/release timing
- `--heroBottomPx` for the SBL mask handoff

Those values are derived from `getBoundingClientRect()` and `clientWidth` very early in the lifecycle, while:
- the custom `Brigada Serif` font uses `font-display: swap` in `src/index.css`, so fallback metrics can render first
- the hero video and sticky layout are still settling
- some re-measure paths are delayed, gated, or one-shot, so a bad first measurement can survive long enough to produce the overlap you showed

## Plan
1. Make hero measurement deterministic
   - Stop measuring against moving or not-yet-stable content where possible.
   - Base the wordmark size and SBL anchor on a stable container, not on another animated element.

2. Separate first paint from measured paint
   - Keep the wordmark and SBL hidden until the serif font is confirmed loaded and the first stable measurement pass completes.
   - Only then reveal the hero content.

3. Replace timing-based recovery with explicit re-sync
   - Remove reliance on timeout re-measures as the main safeguard.
   - Recompute on font readiness, resize, page restore, and actual element resize in a single sync path.

4. Stabilize scroll math
   - Ensure the pin distance and SBL baseline are derived from the final wordmark box, not a transient one.
   - Prevent stale CSS custom properties from surviving remounts or refresh restores.

5. Validate in the preview
   - Test hard refresh, back/forward restore, and repeated reloads at desktop width.
   - Confirm the wordmark and SBL never overlap on first paint or after the intro finishes.

## Technical details
Relevant code paths:
- `src/components/home-v4-v2/Hero.tsx:25-67` fits the wordmark by measuring rendered width
- `src/components/home-v4-v2/Hero.tsx:266-285` computes `--sblTy` and section height from the measured wordmark rect
- `src/components/home-v4-v2/Hero.tsx:339-387` tries to recover with scroll reset, font ready, ResizeObserver, and timeouts
- `src/index.css:14-19` loads `Brigada Serif` with `font-display: swap`, which can cause fallback metrics before the final font metrics arrive

If you approve, I’ll make the hero positioning wait for a stable measurement pass and remove the race-prone parts of the current setup.