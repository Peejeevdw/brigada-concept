import ReelPreview from "./ReelPreview";
import { DEFAULT_BRIO_TOGGLES, DEFAULT_BRIO_SETTINGS } from "@/data/duotones";

export interface FootageColorsLavaSettings {
  enabled: boolean;
  intensity: number;
  softness: number;
  speed: number;
  scale: number;
  blobCount: number;
  blur: number;
}

const DEFAULT_LAVA: FootageColorsLavaSettings = {
  enabled: true,
  intensity: 1,
  softness: 0.5,
  speed: 0.3,
  scale: 0.6,
  blobCount: 6,
  blur: 0,
};

export interface FootageColorsProps {
  mediaSrc: string;
  mediaKind?: "video" | "image";
  aspectRatio?: string;
  points?: number;
  sharpness?: number;
  vibrance?: number;
  cropX?: number;
  cropY?: number;
  cropSize?: number;
  zoom?: number;
  className?: string;
  /** Lavalamp metaball pass settings (merged over defaults). */
  lava?: Partial<FootageColorsLavaSettings>;
}

const FootageColors = ({
  mediaSrc,
  mediaKind = "video",
  aspectRatio,
  points = 7,
  sharpness = 100,
  vibrance = 90,
  cropX = 0.5,
  cropY = 0.5,
  cropSize = 1,
  zoom = 1.5,
  className,
  lava,
}: FootageColorsProps) => {
  return (
    <ReelPreview
      webgl
      mode="footage"
      mediaSrc={mediaSrc}
      mediaKind={mediaKind}
      aspectRatio={aspectRatio}
      cropX={cropX}
      cropY={cropY}
      cropSize={cropSize}
      zoom={zoom}
      grain={0}
      blur={0}
      amount={1}
      thresholds={DEFAULT_BRIO_SETTINGS.thresholds}
      toggles={{ ...DEFAULT_BRIO_TOGGLES, color: true }}
      cluster={{
        enabled: true,
        points,
        sharpness: sharpness / 100,
        vibrance: vibrance / 100,
      }}
      lava={{ ...DEFAULT_LAVA, ...lava }}
      className={className}
    />
  );
};

export default FootageColors;
