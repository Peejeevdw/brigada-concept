"use client";

import { useRef, useState, type MouseEvent } from "react";

/**
 * Full-cover sound toggle for a hero/background video. Tapping/clicking anywhere
 * on the video toggles the sound. Shared by the Vimeo + Bunny/HLS players.
 *
 * - Desktop (hover): native cursor hidden, a labelled pill follows the mouse
 *   ("Play sound" / "Stop sound"). A real following element instead of a CSS
 *   `cursor: url(...)`, which flickers in Chrome.
 * - Mobile/touch (no hover): a visible mute/unmute icon button in the
 *   bottom-right corner, since a cursor affordance is useless on touch.
 *
 * No z-index, so it sits under PosteredVideo's poster until that fades — the
 * control only kicks in once the video is actually revealed.
 */

const SpeakerIcon = ({ muted, size = 15 }: { muted: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
    {muted ? (
      // Slash → currently muted (clicking turns sound on)
      <path
        d="M16 9l5 6m0-6l-5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ) : (
      // Waves → currently playing (clicking turns sound off)
      <path
        d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    )}
  </svg>
);

const SoundCursorOverlay = ({
  muted,
  onClick,
}: {
  muted: boolean;
  onClick: () => void;
}) => {
  const pillRef = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);

  const move = (e: MouseEvent<HTMLButtonElement>) => {
    const host = e.currentTarget.getBoundingClientRect();
    const pill = pillRef.current;
    if (pill) {
      pill.style.transform =
        `translate(${e.clientX - host.left}px, ${e.clientY - host.top}px) ` +
        `translate(-50%, -50%)`;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => {
        setHover(true);
        move(e);
      }}
      onMouseMove={move}
      onMouseLeave={() => setHover(false)}
      aria-label={muted ? "Play sound" : "Stop sound"}
      aria-pressed={!muted}
      className="absolute inset-0 block h-full w-full bg-transparent md:cursor-none"
    >
      {/* Desktop: labelled pill following the mouse. */}
      <span
        ref={pillRef}
        aria-hidden
        className={`pointer-events-none absolute left-0 top-0 hidden items-center gap-2 whitespace-nowrap rounded-full bg-black/55 px-4 py-2 text-[13px] font-medium uppercase tracking-[0.04em] text-white backdrop-blur-md transition-opacity duration-150 md:flex ${
          hover ? "opacity-100" : "opacity-0"
        }`}
      >
        <SpeakerIcon muted={muted} />
        {muted ? "Play sound" : "Stop sound"}
      </span>

      {/* Mobile/touch: visible icon button in the bottom-right corner. */}
      <span
        aria-hidden
        className="absolute bottom-[clamp(14px,4vw,22px)] right-[clamp(14px,4vw,22px)] flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md md:hidden"
      >
        <SpeakerIcon muted={muted} size={19} />
      </span>
    </button>
  );
};

export default SoundCursorOverlay;
