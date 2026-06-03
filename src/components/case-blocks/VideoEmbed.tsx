"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { urlFor } from "@/lib/sanity";
import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "videoEmbed" }>;

/**
 * Video block. Renders an HLS playlist (Bunny / Mux) when provided; falls
 * back to a direct file URL otherwise. Autoplay defaults to true and runs
 * muted-loop in-place.
 */
export function VideoEmbed({ hlsUrl, file, poster, aspect = "16/9", autoplay = true }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const fileUrl = file?.asset?.url;
  const src = hlsUrl || fileUrl;

  useEffect(() => {
    const video = ref.current;
    if (!video || !hlsUrl) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = hlsUrl;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [hlsUrl]);

  if (!src) return null;
  const builder = poster?.asset ? urlFor(poster) : null;
  const posterUrl = builder ? builder.width(2400).fit("max").auto("format").url() : undefined;

  return (
    <section className="px-[clamp(24px,5vw,72px)] py-[clamp(40px,5vw,72px)]">
      <video
        ref={ref}
        className="block w-full h-auto"
        style={{ aspectRatio: aspect.replace("/", " / ") }}
        autoPlay={autoplay}
        muted={autoplay}
        loop={autoplay}
        playsInline
        controls={!autoplay}
        poster={posterUrl}
        {...(!hlsUrl && fileUrl ? { src: fileUrl } : {})}
      />
    </section>
  );
}
