"use client";

import { useState } from "react";

// Image with a Sanity LQIP blur-up: the tiny base64 `lqip` (inlined in the page
// payload) paints instantly so the box is never empty, then the full image fades
// in over it once decoded. Fills its positioned parent — wrap it in a `relative
// overflow-hidden` box that reserves the aspect ratio.
const BlurImage = ({
  src,
  lqip,
  alt = "",
  eager = false,
}: {
  src: string;
  lqip?: string;
  alt?: string;
  eager?: boolean;
}) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {lqip && (
        <img
          src={lqip}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        // Cached images can be `complete` before onLoad attaches — catch that too.
        ref={(node) => {
          if (node?.complete && node.naturalWidth > 0) setLoaded(true);
        }}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
};

export default BlurImage;
