"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { urlFor } from "@/lib/sanity";
import { useIsMobile } from "@/hooks/use-mobile";
import type { CaseBlock } from "./types";

type Props = Extract<CaseBlock, { _type: "videoEmbed" }>;

/**
 * Video block. Renders an HLS playlist (Bunny / Mux) when provided; falls
 * back to a direct file URL otherwise. Autoplay defaults to true and runs
 * muted-loop in-place. On small screens any mobile-specific source/poster
 * wins, falling back to the desktop value when blank.
 */
export function VideoEmbed({
  hlsUrl,
  file,
  poster,
  aspect = "16/9",
  autoplay = true,
  mobileHlsUrl,
  mobileFile,
  mobilePoster,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  const effHls = (isMobile && mobileHlsUrl) || hlsUrl;
  const effFileUrl = (isMobile && mobileFile?.asset?.url) || file?.asset?.url;
  const effPoster = isMobile && mobilePoster?.asset ? mobilePoster : poster;
  const src = effHls || effFileUrl;

  useEffect(() => {
    const video = ref.current;
    if (!video || !effHls) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = effHls;
      return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(effHls);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [effHls]);

  if (!src) return null;
  const builder = effPoster?.asset ? urlFor(effPoster) : null;
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
        {...(!effHls && effFileUrl ? { src: effFileUrl } : {})}
      />
    </section>
  );
}
