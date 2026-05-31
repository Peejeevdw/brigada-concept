# BrioEffect

Drop-in WebGL component that applies the Brio look (mesh + lava gradient + grain) to any image or video. The look is locked to match the original Brio homepage. The only public choices are the color mode and, in palette/custom modes, which colors.

## Install

This package is delivered as a folder of source files, not an npm package. Copy these three paths into your project's `src/` folder:

```
src/brio-effect/        (this folder)
src/components/BrioWebGLOverlay.tsx
src/data/duotones.ts
```

Requirements:
- React 18+
- A bundler with the `@/*` path alias pointed at `src/*` (Vite, Next, CRA with craco, etc.)
- A WebGL-capable browser

No npm dependencies are added.

If your project does not use the `@/*` alias, do a find-and-replace on the three files above and change `@/components/...` and `@/data/...` to relative paths.

## Usage

```tsx
import { BrioEffect } from "@/brio-effect";

// 1. Footage colors (k-means on the source media)
<BrioEffect src="/reel.mp4" mode="footage" className="aspect-video w-full" />

// 2. Curated Brio palette
<BrioEffect
  src="/hero.jpg"
  mode="palette"
  paletteId="brio-01"
  className="aspect-video w-full"
/>

// 3. Custom brand colors (2 to 7 hex stops)
<BrioEffect
  src="/hero.jpg"
  mode="custom"
  colors={["#0A0A0A", "#E8401C", "#F3F2EF"]}
  className="aspect-video w-full"
/>
```

List palettes:

```ts
import { getPalettes, PALETTE_IDS } from "@/brio-effect";

const palettes = getPalettes(); // [{ id, name, stops: string[] }, ...]
```

## Props

| Prop        | Type                                   | Required              | Notes                       |
|-------------|----------------------------------------|-----------------------|-----------------------------|
| `src`       | `string`                               | yes                   | Image or video URL          |
| `mode`      | `"footage" \| "palette" \| "custom"`   | yes                   | Color strategy              |
| `paletteId` | `string`                               | when mode="palette"   | One of `PALETTE_IDS`        |
| `colors`    | `string[]`                             | when mode="custom"    | 2 to 7 hex values           |
| `className` | `string`                               | no                    | Sizes the container         |

All look settings (mesh, lava gradient, grain, zoom, preset, thresholds) are hardcoded to the Brio defaults and intentionally not exposed.

## Notes

- The caller controls width/height via `className` or wrapping layout.
- Cross-origin sources need permissive CORS for footage palette extraction. If unavailable, the component silently falls back.
- File extension determines image vs video (`.mp4|.webm|.mov|.m4v|.ogv` = video).
