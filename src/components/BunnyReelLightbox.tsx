import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * Osmo "Custom Bunny HLS Lightbox" — faithful port.
 *
 * A click-to-open lightbox video player for Bunny.net HLS (.m3u8) streams.
 * Markup, CSS and the data-* driven state machine are kept 1:1 with Osmo's
 * resource; only the integration is adapted for React/Vite:
 *   - hls.js is imported as a module instead of the CDN global (window.Hls)
 *   - the init logic runs in a useEffect, scoped to this component's root
 *
 * Trigger it from anywhere with:
 *   <button data-bunny-lightbox-control="open"
 *           data-bunny-lightbox-src="https://….b-cdn.net/<guid>/playlist.m3u8">
 *     <img data-bunny-lightbox-placeholder src="poster.jpg" alt="" /> (optional)
 *   </button>
 * Close: any [data-bunny-lightbox-control="close"] element, or the ESC key.
 */
const BunnyReelLightbox = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const player = root.querySelector<HTMLElement>("[data-bunny-lightbox-init]");
    if (!player) return;

    // The status wrapper is the element carrying [data-bunny-lightbox-status]
    // (Osmo: player.closest), NOT the outer React ref div — the close handler
    // compares against this exact node.
    const wrapper = player.closest<HTMLElement>("[data-bunny-lightbox-status]");
    if (!wrapper) return;

    const video = player.querySelector("video");
    if (!video) return;

    try { video.pause(); } catch (_) { /* noop */ }
    try { video.removeAttribute("src"); video.load(); } catch (_) { /* noop */ }

    // ---- Attribute helpers ----
    const setAttr = (el: Element, name: string, val: boolean | string) => {
      const str = typeof val === "boolean" ? (val ? "true" : "false") : String(val);
      if (el.getAttribute(name) !== str) el.setAttribute(name, str);
    };
    const setStatus = (s: string) => setAttr(player, "data-player-status", s);
    const setMutedState = (v: boolean) => { video.muted = !!v; setAttr(player, "data-player-muted", video.muted); };
    const setFsAttr = (v: boolean) => setAttr(player, "data-player-fullscreen", !!v);
    const setActivated = (v: boolean) => setAttr(player, "data-player-activated", !!v);
    if (!player.hasAttribute("data-player-activated")) setActivated(false);

    // ---- Elements ----
    const timeline = player.querySelector<HTMLElement>("[data-player-timeline]");
    const progressBar = player.querySelector<HTMLElement>("[data-player-progress]");
    const bufferedBar = player.querySelector<HTMLElement>("[data-player-buffered]");
    const handle = player.querySelector<HTMLElement>("[data-player-timeline-handle]");
    const timeDurationEls = player.querySelectorAll<HTMLElement>("[data-player-time-duration]");
    const timeProgressEls = player.querySelectorAll<HTMLElement>("[data-player-time-progress]");
    const playerPlaceholderImg = player.querySelector<HTMLImageElement>("[data-bunny-lightbox-placeholder]");

    // ---- Flags ----
    const updateSize = player.getAttribute("data-player-update-size"); // "true" | "cover" | "false" | null
    const autoplay = player.getAttribute("data-player-autoplay") === "true";
    const initialMuted = player.getAttribute("data-player-muted") === "true";

    let pendingPlay = false;

    video.loop = false;
    setMutedState(initialMuted);

    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.playsInline = true;
    if (typeof (video as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback !== "undefined") {
      (video as HTMLVideoElement & { disableRemotePlayback?: boolean }).disableRemotePlayback = true;
    }
    if (autoplay) video.autoplay = false;

    const isSafariNative = !!video.canPlayType("application/vnd.apple.mpegurl");
    const canUseHlsJs = !!(Hls && Hls.isSupported()) && !isSafariNative;

    // ---- Load/attach only when opened ----
    let isAttached = false;
    let currentSrc = "";
    let lastPauseBy = "";
    let rafId = 0;
    let autoStartOnReady = false;

    // Holders for instance state Osmo stashed on the element
    const store = player as HTMLElement & { _hls?: Hls | null; _applyClamp?: () => void };

    // ---- Helpers (declared first; used throughout) ----
    const pad2 = (n: number) => (n < 10 ? "0" : "") + n;
    const formatTime = (sec: number) => {
      if (!isFinite(sec) || sec < 0) return "00:00";
      const s = Math.floor(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
      return h > 0 ? `${h}:${pad2(m)}:${pad2(r)}` : `${pad2(m)}:${pad2(r)}`;
    };
    const setText = (nodes: NodeListOf<HTMLElement>, text: string) => nodes.forEach((n) => { n.textContent = text; });
    const safePlay = (v: HTMLVideoElement) => { const p = v.play(); if (p && typeof p.then === "function") p.catch(() => {}); };
    const readyIfIdle = () => {
      if (!pendingPlay &&
          player.getAttribute("data-player-activated") !== "true" &&
          player.getAttribute("data-player-status") === "idle") {
        player.setAttribute("data-player-status", "ready");
      }
    };

    // ---- Clamp setup for [data-bunny-lightbox-calc-height] ----
    const calcBox = wrapper.querySelector<HTMLElement>("[data-bunny-lightbox-calc-height]");
    const getRatio = (): number | null => {
      if (updateSize === "cover") return null;
      if (updateSize === "true") {
        if (video.videoWidth && video.videoHeight) return video.videoWidth / video.videoHeight;
        const before = player.querySelector<HTMLElement>("[data-player-before]");
        if (before?.style?.paddingTop) {
          const pct = parseFloat(before.style.paddingTop);
          if (pct > 0) return 100 / pct;
        }
        const r = player.getBoundingClientRect();
        if (r.height > 0) return r.width / r.height;
        return 16 / 9;
      }
      const beforeFalse = player.querySelector<HTMLElement>("[data-player-before]");
      if (beforeFalse?.style?.paddingTop) {
        const pad = parseFloat(beforeFalse.style.paddingTop);
        if (pad > 0) return 100 / pad;
      }
      const rb = player.getBoundingClientRect();
      if (rb.height > 0) return rb.width / rb.height;
      return 16 / 9;
    };
    const applyClamp = () => {
      if (!calcBox) return;
      if (updateSize === "cover") { calcBox.style.maxWidth = ""; calcBox.style.maxHeight = ""; return; }
      const cs = getComputedStyle(wrapper);
      const pt = parseFloat(cs.paddingTop) || 0;
      const pb = parseFloat(cs.paddingBottom) || 0;
      const pl = parseFloat(cs.paddingLeft) || 0;
      const pr = parseFloat(cs.paddingRight) || 0;
      const cw = wrapper.clientWidth - pl - pr;
      const ch = wrapper.clientHeight - pt - pb;
      if (cw <= 0 || ch <= 0) return;
      const ratio = getRatio();
      if (!ratio) { calcBox.style.maxWidth = ""; calcBox.style.maxHeight = ""; return; }
      const hIfFullWidth = cw / ratio;
      if (hIfFullWidth <= ch) {
        calcBox.style.maxWidth = "100%";
        calcBox.style.maxHeight = `${(hIfFullWidth / ch) * 100}%`;
      } else {
        calcBox.style.maxHeight = "100%";
        calcBox.style.maxWidth = `${((ch * ratio) / cw) * 100}%`;
      }
    };
    let rafPending = false;
    const debouncedApply = () => {
      if (rafPending) return;
      if (wrapper.getAttribute("data-bunny-lightbox-status") !== "active") return;
      rafPending = true;
      requestAnimationFrame(() => { rafPending = false; applyClamp(); });
    };
    const ro = new ResizeObserver(debouncedApply);
    if (calcBox) ro.observe(wrapper);
    window.addEventListener("resize", debouncedApply);
    window.addEventListener("orientationchange", debouncedApply);
    if (updateSize === "true") {
      video.addEventListener("loadedmetadata", debouncedApply);
      video.addEventListener("loadeddata", debouncedApply);
      video.addEventListener("playing", debouncedApply);
    }
    store._applyClamp = debouncedApply;
    if (calcBox) debouncedApply();

    // ---- Ratio helpers (iOS-safe) ----
    const updateBeforeRatioIOSSafe = () => {
      if (updateSize !== "true") return;
      const before = player.querySelector<HTMLElement>("[data-player-before]");
      if (!before) return;
      const apply = (w: number, h: number) => {
        if (!w || !h) return;
        before.style.paddingTop = `${(h / w) * 100}%`;
        if (typeof store._applyClamp === "function") store._applyClamp();
      };
      if (video.videoWidth && video.videoHeight) { apply(video.videoWidth, video.videoHeight); return; }
      if (store._hls && store._hls.levels && store._hls.levels.length) {
        const lvls = store._hls.levels;
        const best = lvls.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a), lvls[0]);
        if (best && best.width && best.height) { apply(best.width, best.height); return; }
      }
      requestAnimationFrame(() => {
        if (video.videoWidth && video.videoHeight) { apply(video.videoWidth, video.videoHeight); return; }
        let master = typeof currentSrc === "string" && currentSrc ? currentSrc : "";
        if (!master || master.indexOf("blob:") === 0) {
          const attrSrc = player.getAttribute("data-bunny-lightbox-src") || player.getAttribute("data-player-src") || "";
          if (attrSrc && attrSrc.indexOf("blob:") !== 0) master = attrSrc;
        }
        if (!master || !/^https?:/i.test(master)) return;
        fetch(master, { credentials: "omit", cache: "no-store" })
          .then((r) => { if (!r.ok) throw new Error(); return r.text(); })
          .then((txt) => {
            const lines = txt.split(/\r?\n/);
            let bestW = 0, bestH = 0, last: string | null = null;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.indexOf("#EXT-X-STREAM-INF:") === 0) { last = line; }
              else if (last && line && line[0] !== "#") {
                const m = /RESOLUTION=(\d+)x(\d+)/.exec(last);
                if (m) {
                  const W = parseInt(m[1], 10), H = parseInt(m[2], 10);
                  if (W > bestW) { bestW = W; bestH = H; }
                }
                last = null;
              }
            }
            if (bestW && bestH) apply(bestW, bestH);
          })
          .catch(() => {});
      });
    };

    // ---- Unified attach pipeline ----
    const withAttach = (src: string, onReady: () => void) => {
      if (isSafariNative) {
        video.preload = "auto";
        video.src = src;
        video.addEventListener("loadedmetadata", onReady, { once: true });
        return;
      }
      if (canUseHlsJs) {
        const hls = new Hls({ maxBufferLength: 10 });
        store._hls = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => { hls.loadSource(src); });
        hls.on(Hls.Events.MANIFEST_PARSED, () => { onReady(); });
        hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
          if (data?.details && isFinite(data.details.totalduration) && timeDurationEls.length) {
            setText(timeDurationEls, formatTime(data.details.totalduration));
          }
        });
        return;
      }
      video.preload = "auto";
      video.src = src;
      video.addEventListener("loadedmetadata", onReady, { once: true });
    };

    const attachMediaFor = (src: string) => {
      if (currentSrc === src && isAttached) return;
      if (store._hls) { try { store._hls.destroy(); } catch (_) { /* noop */ } store._hls = null; }
      if (timeDurationEls.length) setText(timeDurationEls, "00:00");
      currentSrc = src;
      isAttached = true;
      withAttach(src, function onReady() {
        readyIfIdle();
        updateBeforeRatioIOSSafe();
        if (typeof store._applyClamp === "function") store._applyClamp();
        if (timeDurationEls.length && video.duration) setText(timeDurationEls, formatTime(video.duration));
        if (autoStartOnReady && wrapper.getAttribute("data-bunny-lightbox-status") === "active") {
          setStatus("loading");
          safePlay(video);
          autoStartOnReady = false;
        }
      });
    };

    const ensureOpenUI = (isActive: boolean) => {
      const state = isActive ? "active" : "not-active";
      if (wrapper.getAttribute("data-bunny-lightbox-status") !== state) {
        wrapper.setAttribute("data-bunny-lightbox-status", state);
      }
      if (isActive && typeof store._applyClamp === "function") store._applyClamp();
    };

    // ---- Centralized open policy ----
    const isSameSrc = (next: string) => !!currentSrc && currentSrc === next;
    const planOnOpen = (next: string) => {
      const same = isSameSrc(next);
      if (!same) {
        try { if (!video.paused && !video.ended) video.pause(); } catch (_) { /* noop */ }
        if (store._hls) { try { store._hls.destroy(); } catch (_) { /* noop */ } store._hls = null; }
        isAttached = false; currentSrc = "";
        if (timeDurationEls.length) setText(timeDurationEls, "00:00");
        setActivated(false);
        setStatus("idle");
        attachMediaFor(next);
        autoStartOnReady = !!autoplay;
        pendingPlay = !!autoplay;
        return;
      }
      autoStartOnReady = !!autoplay;
      if (autoplay) {
        setStatus("loading");
        safePlay(video);
      } else {
        try { if (!video.paused && !video.ended) video.pause(); } catch (_) { /* noop */ }
        setActivated(false);
        setStatus("paused");
      }
    };

    // ---- Open/Close API ----
    const openLightbox = (src: string, placeholderUrl: string) => {
      if (!src) return;
      const activate = () => { ensureOpenUI(true); planOnOpen(src); };
      if (playerPlaceholderImg && placeholderUrl) {
        const needsSwap = playerPlaceholderImg.getAttribute("src") !== placeholderUrl;
        if (needsSwap || !playerPlaceholderImg.complete || !playerPlaceholderImg.naturalWidth) {
          playerPlaceholderImg.onload = () => { playerPlaceholderImg.onload = null; activate(); };
          playerPlaceholderImg.onerror = () => { playerPlaceholderImg.onerror = null; activate(); };
          if (needsSwap) playerPlaceholderImg.setAttribute("src", placeholderUrl);
          else playerPlaceholderImg.dispatchEvent(new Event("load"));
        } else { activate(); }
      } else { activate(); }
    };

    const closeLightbox = () => {
      ensureOpenUI(false);
      let hasPlayed = false;
      try {
        if (video.played && video.played.length) {
          for (let i = 0; i < video.played.length; i++) {
            if (video.played.end(i) > 0) { hasPlayed = true; break; }
          }
        } else { hasPlayed = video.currentTime > 0; }
      } catch (_) { /* noop */ }
      try { if (!video.paused && !video.ended) video.pause(); } catch (_) { /* noop */ }
      setActivated(false);
      setStatus(hasPlayed ? "paused" : "idle");
    };

    const togglePlay = () => {
      if (video.paused || video.ended) {
        pendingPlay = true; lastPauseBy = ""; setStatus("loading"); safePlay(video);
      } else { lastPauseBy = "manual"; video.pause(); }
    };
    void lastPauseBy;
    const toggleMute = () => setMutedState(!video.muted);

    // ---- Fullscreen helpers ----
    type FsEl = HTMLElement & {
      webkitRequestFullscreen?: () => void;
      webkitEnterFullscreen?: () => void;
      webkitSupportsFullscreen?: boolean;
    };
    type FsVideo = HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitExitFullscreen?: () => void;
      webkitSupportsFullscreen?: boolean;
      webkitDisplayingFullscreen?: boolean;
    };
    type FsDoc = Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => void;
    };
    const fsDoc = document as FsDoc;
    const fsVideo = video as FsVideo;
    const isFsActive = () => !!(document.fullscreenElement || fsDoc.webkitFullscreenElement);
    const enterFullscreen = () => {
      const p = player as FsEl;
      if (p.requestFullscreen) return p.requestFullscreen();
      if (fsVideo.requestFullscreen) return fsVideo.requestFullscreen();
      if (fsVideo.webkitSupportsFullscreen && typeof fsVideo.webkitEnterFullscreen === "function") return fsVideo.webkitEnterFullscreen();
    };
    const exitFullscreen = () => {
      if (document.exitFullscreen) return document.exitFullscreen();
      if (fsDoc.webkitExitFullscreen) return fsDoc.webkitExitFullscreen();
      if (fsVideo.webkitDisplayingFullscreen && typeof fsVideo.webkitExitFullscreen === "function") return fsVideo.webkitExitFullscreen();
    };
    const toggleFullscreen = () => { if (isFsActive() || fsVideo.webkitDisplayingFullscreen) exitFullscreen(); else enterFullscreen(); };
    const onFsChange = () => setFsAttr(isFsActive());
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    const onWebkitBegin = () => setFsAttr(true);
    const onWebkitEnd = () => setFsAttr(false);
    video.addEventListener("webkitbeginfullscreen", onWebkitBegin);
    video.addEventListener("webkitendfullscreen", onWebkitEnd);

    // ---- Player-local control clicks ----
    const onPlayerClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest("[data-player-control]");
      if (!btn || !player.contains(btn)) return;
      const type = btn.getAttribute("data-player-control");
      if (type === "play" || type === "pause" || type === "playpause") togglePlay();
      else if (type === "mute") toggleMute();
      else if (type === "fullscreen") toggleFullscreen();
    };
    player.addEventListener("click", onPlayerClick);

    // ---- Time text ----
    const updateTimeTexts = () => {
      if (timeDurationEls.length) setText(timeDurationEls, formatTime(video.duration));
      if (timeProgressEls.length) setText(timeProgressEls, formatTime(video.currentTime));
    };
    const onLoadedMeta = () => { updateTimeTexts(); updateBeforeRatioIOSSafe(); };
    const onLoadedData = () => { updateBeforeRatioIOSSafe(); };
    const onPlayingRatio = () => { updateBeforeRatioIOSSafe(); };
    video.addEventListener("timeupdate", updateTimeTexts);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("playing", onPlayingRatio);
    video.addEventListener("durationchange", updateTimeTexts);

    // ---- rAF visuals (progress + handle) ----
    const pctClamp = (p: number) => (p < 0 ? 0 : p > 100 ? 100 : p);
    const updateProgressVisuals = () => {
      if (!video.duration) return;
      const playedPct = (video.currentTime / video.duration) * 100;
      if (progressBar) progressBar.style.transform = `translateX(${-100 + playedPct}%)`;
      if (handle) handle.style.left = `${pctClamp(playedPct)}%`;
    };
    const loop = () => {
      updateProgressVisuals();
      if (!video.paused && !video.ended) rafId = requestAnimationFrame(loop);
    };

    // ---- Buffered bar ----
    const updateBufferedBar = () => {
      if (!bufferedBar || !video.duration || !video.buffered.length) return;
      const end = video.buffered.end(video.buffered.length - 1);
      const buffPct = (end / video.duration) * 100;
      bufferedBar.style.transform = `translateX(${-100 + buffPct}%)`;
    };
    video.addEventListener("progress", updateBufferedBar);
    video.addEventListener("loadedmetadata", updateBufferedBar);
    video.addEventListener("durationchange", updateBufferedBar);

    // ---- Media event wiring ----
    const onPlay = () => { setActivated(true); cancelAnimationFrame(rafId); loop(); setStatus("playing"); };
    const onPlaying = () => { pendingPlay = false; setStatus("playing"); };
    const onPause = () => { pendingPlay = false; cancelAnimationFrame(rafId); updateProgressVisuals(); setStatus("paused"); };
    const onWaiting = () => { setStatus("loading"); };
    const onCanplay = () => { readyIfIdle(); };
    video.addEventListener("play", onPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("canplay", onCanplay);

    const onEnded = () => {
      pendingPlay = false;
      cancelAnimationFrame(rafId);
      updateProgressVisuals();
      setActivated(false);
      video.currentTime = 0;
      if (document.fullscreenElement || fsDoc.webkitFullscreenElement || fsVideo.webkitDisplayingFullscreen) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (fsDoc.webkitExitFullscreen) fsDoc.webkitExitFullscreen();
        else if (fsVideo.webkitExitFullscreen) fsVideo.webkitExitFullscreen();
      }
      closeLightbox();
    };
    video.addEventListener("ended", onEnded);

    // ---- Scrubbing (pointer events) ----
    let onTimelineResize: (() => void) | null = null;
    if (timeline) {
      let dragging = false, wasPlaying = false, targetTime = 0, lastSeekTs = 0;
      const seekThrottle = 180;
      let rect: DOMRect | null = null;
      onTimelineResize = () => { if (!dragging) rect = null; };
      window.addEventListener("resize", onTimelineResize);
      const getFractionFromX = (x: number) => {
        if (!rect) rect = timeline.getBoundingClientRect();
        let f = (x - rect.left) / rect.width; if (f < 0) f = 0; if (f > 1) f = 1; return f;
      };
      const previewAtFraction = (f: number) => {
        if (!video.duration) return;
        const pct = f * 100;
        if (progressBar) progressBar.style.transform = `translateX(${-100 + pct}%)`;
        if (handle) handle.style.left = `${pct}%`;
        if (timeProgressEls.length) setText(timeProgressEls, formatTime(f * video.duration));
      };
      const maybeSeek = (now: number) => {
        if (!video.duration) return;
        if (now - lastSeekTs < seekThrottle) return;
        lastSeekTs = now; video.currentTime = targetTime;
      };
      const onPointerMove = (e: PointerEvent) => {
        if (!dragging) return;
        const f = getFractionFromX(e.clientX); targetTime = f * video.duration; previewAtFraction(f); maybeSeek(performance.now()); e.preventDefault();
      };
      const onPointerUp = () => {
        if (!dragging) return;
        dragging = false; player.setAttribute("data-timeline-drag", "false"); rect = null; video.currentTime = targetTime;
        if (wasPlaying) safePlay(video); else { updateProgressVisuals(); updateTimeTexts(); }
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };
      const onPointerDown = (e: PointerEvent) => {
        if (!video.duration) return;
        dragging = true; wasPlaying = !video.paused && !video.ended; if (wasPlaying) video.pause();
        player.setAttribute("data-timeline-drag", "true"); rect = timeline.getBoundingClientRect();
        const f = getFractionFromX(e.clientX); targetTime = f * video.duration; previewAtFraction(f); maybeSeek(performance.now());
        timeline.setPointerCapture?.(e.pointerId);
        window.addEventListener("pointermove", onPointerMove, { passive: false });
        window.addEventListener("pointerup", onPointerUp, { passive: true });
        e.preventDefault();
      };
      timeline.addEventListener("pointerdown", onPointerDown, { passive: false });
      if (handle) handle.addEventListener("pointerdown", onPointerDown, { passive: false });
    }

    // ---- Hover/idle detection ----
    let hoverTimer = 0;
    const hoverHideDelay = 3000;
    const setHover = (state: string) => {
      if (player.getAttribute("data-player-hover") !== state) player.setAttribute("data-player-hover", state);
    };
    const scheduleHide = () => { clearTimeout(hoverTimer); hoverTimer = window.setTimeout(() => setHover("idle"), hoverHideDelay); };
    const wakeControls = () => { setHover("active"); scheduleHide(); };
    player.addEventListener("pointerdown", wakeControls);
    document.addEventListener("fullscreenchange", wakeControls);
    document.addEventListener("webkitfullscreenchange", wakeControls);
    let trackingMove = false;
    const onPointerMoveGlobal = (e: PointerEvent) => {
      const r = player.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) wakeControls();
    };
    const onPlayerEnter = () => {
      wakeControls();
      if (!trackingMove) { trackingMove = true; window.addEventListener("pointermove", onPointerMoveGlobal, { passive: true }); }
    };
    const onPlayerLeave = () => {
      setHover("idle"); clearTimeout(hoverTimer);
      if (trackingMove) { trackingMove = false; window.removeEventListener("pointermove", onPointerMoveGlobal); }
    };
    player.addEventListener("pointerenter", onPlayerEnter);
    player.addEventListener("pointerleave", onPlayerLeave);

    // ---- Global open/close controls + ESC ----
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const openBtn = target.closest("[data-bunny-lightbox-control='open']");
      if (openBtn) {
        const src = openBtn.getAttribute("data-bunny-lightbox-src") || "";
        if (!src) return;
        const imgEl = openBtn.querySelector("[data-bunny-lightbox-placeholder]");
        const placeholderUrl = imgEl ? imgEl.getAttribute("src") || "" : "";
        openLightbox(src, placeholderUrl);
        return;
      }
      const closeBtn = target.closest("[data-bunny-lightbox-control='close']");
      if (closeBtn) {
        const closeInWrapper = closeBtn.closest("[data-bunny-lightbox-status]");
        if (closeInWrapper === wrapper) closeLightbox();
      }
    };
    const onKeydown = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);

    // ---- Cleanup ----
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(hoverTimer);
      ro.disconnect();
      if (store._hls) { try { store._hls.destroy(); } catch (_) { /* noop */ } store._hls = null; }
      window.removeEventListener("resize", debouncedApply);
      window.removeEventListener("orientationchange", debouncedApply);
      if (onTimelineResize) window.removeEventListener("resize", onTimelineResize);
      if (trackingMove) window.removeEventListener("pointermove", onPointerMoveGlobal);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
      document.removeEventListener("fullscreenchange", wakeControls);
      document.removeEventListener("webkitfullscreenchange", wakeControls);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeydown);
      player.removeEventListener("click", onPlayerClick);
      player.removeEventListener("pointerdown", wakeControls);
      player.removeEventListener("pointerenter", onPlayerEnter);
      player.removeEventListener("pointerleave", onPlayerLeave);
      try { video.pause(); } catch (_) { /* noop */ }
    };
  }, []);

  return (
    <div ref={rootRef}>
      <style>{`
        /* Lightbox */
        .bunny-lightbox {
          z-index: 300; pointer-events: none;
          justify-content: center; align-items: center;
          padding: 5vw; display: flex; position: fixed; inset: 0; overflow: hidden;
        }
        .bunny-lightbox__calc {
          transition: transform 0.3s cubic-bezier(0.625, 0.05, 0, 1), opacity 0.3s linear, visibility 0.3s linear;
          width: 100%; height: 100%; position: relative;
          opacity: 0; visibility: hidden; transform: scale(0.9) rotate(0.001deg);
        }
        [data-bunny-lightbox-status="active"] .bunny-lightbox__calc {
          opacity: 1; visibility: visible; transform: scale(1) rotate(0.001deg);
        }
        .bunny-lightbox__dark {
          opacity: .95; pointer-events: auto; background-color: #191512;
          justify-content: center; align-items: center;
          width: 100%; height: 100%; display: flex; position: absolute; top: 0; left: 0;
        }
        .bunny-lightbox__close {
          z-index: 600; pointer-events: auto; border-radius: 50%;
          justify-content: center; align-items: center;
          width: 3em; height: 3em; display: flex; position: absolute; top: 2.5vw; right: 2.5vw;
          color: #000; background: #fff; border: 0; cursor: pointer;
        }
        .bunny-lightbox__close-bar {
          background-color: currentColor; width: 1em; height: .125em; position: absolute; transform: rotate(-45deg);
        }
        .bunny-lightbox__close-bar.is--duplicate { transform: rotate(45deg); }
        [data-bunny-lightbox-status] .bunny-lightbox__dark,
        [data-bunny-lightbox-status] .bunny-lightbox__close {
          transition: opacity 0.3s linear, visibility 0.3s linear; opacity: 0; visibility: hidden;
        }
        [data-bunny-lightbox-status="active"] .bunny-lightbox__dark,
        [data-bunny-lightbox-status="active"] .bunny-lightbox__close { opacity: 1; visibility: visible; }

        /* Player */
        .bunny-lightbox-player {
          pointer-events: none; color: #fff; isolation: isolate; border-radius: 1em;
          justify-content: center; align-items: center; width: 100%; display: flex; position: relative; overflow: hidden;
          -webkit-mask-image: radial-gradient(#fff, #000); mask-image: radial-gradient(#fff, #000);
        }
        .bunny-lightbox-player__before { padding-top: 62.5%; }
        [data-bunny-lightbox-init] :is(.bunny-lightbox-player__placeholder, .bunny-lightbox-player__dark, .bunny-lightbox-player__playpause, .bunny-lightbox-player__loading) {
          transition: opacity 0.3s linear, visibility 0.3s linear;
        }
        .bunny-lightbox-player__placeholder { object-fit: cover; width: 100%; height: 100%; position: absolute; }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__placeholder,
        [data-bunny-lightbox-init][data-player-status="paused"] .bunny-lightbox-player__placeholder,
        [data-bunny-lightbox-init][data-player-activated="true"][data-player-status="ready"] .bunny-lightbox-player__placeholder {
          opacity: 0; visibility: hidden;
        }
        .bunny-lightbox-player__dark { opacity: .1; background-color: #000; width: 100%; height: 100%; position: absolute; }
        [data-bunny-lightbox-init][data-player-status="paused"] .bunny-lightbox-player__dark,
        [data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__dark { opacity: 0.3; }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__dark { opacity: 0; }
        .bunny-lightbox-player__video { width: 100%; height: 100%; padding-bottom: 0; padding-right: 0; display: block; position: absolute; top: 0; left: 0; }
        .bunny-lightbox-player__playpause {
          pointer-events: auto; justify-content: center; align-items: center; width: 100%; height: 100%; display: flex; position: absolute;
        }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__playpause,
        [data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__playpause { opacity: 0; }
        [data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__playpause { opacity: 1; }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__play-svg,
        [data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__play-svg { display: none; }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__pause-svg,
        [data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__pause-svg { display: block; }
        .bunny-lightbox-player__loading {
          opacity: 0; visibility: hidden; background-color: #00000054;
          justify-content: center; align-items: center; width: 100%; height: 100%; display: flex; position: absolute;
        }
        [data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__loading { opacity: 1; visibility: visible; }
        .bunny-lightbox-player__interface {
          flex-flow: column; justify-content: flex-end; align-items: baseline; width: 100%; height: 100%; display: flex; position: absolute;
          transition: all 0.6s cubic-bezier(0.625, 0.05, 0, 1);
        }
        [data-bunny-lightbox-init][data-player-status="playing"] .bunny-lightbox-player__interface,
        [data-bunny-lightbox-init][data-player-status="loading"] .bunny-lightbox-player__interface {
          opacity: 0; transform: translateY(1em) rotate(0.001deg);
        }
        [data-bunny-lightbox-init][data-player-status="playing"][data-player-hover="active"] .bunny-lightbox-player__interface,
        [data-bunny-lightbox-init][data-player-status="loading"][data-player-hover="active"] .bunny-lightbox-player__interface {
          opacity: 1; transform: translateY(0em) rotate(0.001deg);
        }
        .bunny-lightbox-player__interface-bottom {
          grid-column-gap: 1em; grid-row-gap: 1em; pointer-events: auto;
          justify-content: space-between; align-items: center; width: 100%; padding: min(2em, 4vw); display: flex; position: relative;
        }
        .bunny-lightbox-player__toggle-mute, .bunny-lightbox-player__toggle-fullscreen { cursor: pointer; width: 1.5em; height: 1.5em; }
        .bunny-lightbox-player__timeline {
          cursor: pointer; flex: 1; align-items: center; height: 1em; margin-left: .5em; margin-right: .5em; display: flex; position: relative;
        }
        [data-bunny-lightbox-init][data-player-status="idle"][data-player-activated="false"] .bunny-lightbox-player__timeline,
        [data-bunny-lightbox-init][data-player-status="ready"][data-player-activated="false"] .bunny-lightbox-player__timeline { pointer-events: none; }
        .bunny-lightbox-player__timeline-progress {
          pointer-events: none; background-color: #ff4c24; border-radius: 1em; width: 100%; height: 100%; position: absolute; transform: translateX(-100%);
        }
        .bunny-lightbox-player__timeline-buffered {
          opacity: .2; pointer-events: none; background-color: #fff; border-radius: 1em; width: 100%; height: 100%; position: absolute; transform: translateX(-100%);
        }
        .bunny-lightbox-player__timeline-handle {
          transition: transform 0.15s ease-in-out; pointer-events: none; background-color: #ff4c24; border-radius: 1em;
          width: 1em; height: 1em; position: absolute; top: 50%; transform: translate(-50%, -50%) scale(0);
        }
        [data-bunny-lightbox-init][data-timeline-drag="true"] .bunny-lightbox-player__timeline-handle { transform: translate(-50%, -50%) scale(1); }
        .bunny-lightbox-player__timeline-bar { border-radius: 1em; width: 100%; height: 30%; position: absolute; overflow: hidden; }
        .bunny-lightbox-player__time {
          grid-column-gap: .125em; grid-row-gap: .125em; flex: none; justify-content: center; align-items: center; width: 5.75em; display: flex;
        }
        .bunny-lightbox-player__timeline-bg { background-color: #ffffff26; border-radius: 1em; width: 100%; height: 100%; position: absolute; }
        .bunny-lightbox-player__toggle-playpause { cursor: pointer; width: 1.5em; height: 1.5em; }
        .bunny-lightbox-player__text { white-space: nowrap; margin-bottom: 0; font-size: .9375em; line-height: 1; }
        .bunny-lightbox-player__big-btn {
          -webkit-backdrop-filter: blur(1em); backdrop-filter: blur(1em); cursor: pointer; background-color: #64646433;
          border: 1px solid #ffffff1a; border-radius: 50%; justify-content: center; align-items: center;
          width: 6em; height: 6em; padding: 2em; display: flex; position: relative;
        }
        .bunny-lightbox-player__loading-svg { width: 6em; }
        .bunny-lightbox-player__pause-svg { display: none; }
        .bunny-lightbox-player__interface-fade {
          opacity: .5; background-image: linear-gradient(#0000, #000); width: 100%; height: 25%; position: absolute; bottom: 0;
        }
        .bunny-lightbox-player__interface-btns { grid-column-gap: .5em; grid-row-gap: .5em; align-items: center; display: flex; }
        [data-bunny-lightbox-init][data-player-muted="true"] .bunny-lightbox-player__volume-mute-svg { display: block; }
        [data-bunny-lightbox-init][data-player-muted="true"] .bunny-lightbox-player__volume-up-svg { display: none; }
        .bunny-lightbox-player__volume-mute-svg { display: none; }
        .bunny-lightbox-player__volume-up-svg { display: block; }
        .bunny-lightbox-player__fullscreen-shrink-svg { display: none; }
        .bunny-lightbox-player__fullscreen-scale-svg { display: block; }
        [data-bunny-lightbox-init][data-player-fullscreen="true"] .bunny-lightbox-player__fullscreen-shrink-svg { display: block; }
        [data-bunny-lightbox-init][data-player-fullscreen="true"] .bunny-lightbox-player__fullscreen-scale-svg { display: none; }
        [data-bunny-lightbox-init][data-player-update-size="cover"] { height: 100%; top: 0; left: 0; position: absolute; }
        [data-bunny-lightbox-init][data-player-update-size="cover"] [data-player-before] { display: none; }
        [data-bunny-lightbox-init][data-player-update-size="cover"][data-player-fullscreen="false"] .bunny-lightbox-player__video { object-fit: cover; }
      `}</style>

      <div data-bunny-lightbox-status="not-active" className="bunny-lightbox">
        <div data-bunny-lightbox-control="close" className="bunny-lightbox__dark" />
        <div data-bunny-lightbox-calc-height className="bunny-lightbox__calc">
          <div
            data-bunny-lightbox-init
            data-player-muted="false"
            data-player-fullscreen="false"
            data-player-activated="false"
            data-player-autoplay="true"
            data-player-hover="idle"
            data-player-src=""
            data-player-status="idle"
            data-player-update-size="true"
            className="bunny-lightbox-player"
          >
            <div data-player-before className="bunny-lightbox-player__before" />
            <video preload="auto" width={1920} height={1080} playsInline className="bunny-lightbox-player__video" />
            <img data-bunny-lightbox-placeholder src="" alt="" className="bunny-lightbox-player__placeholder" />
            <div className="bunny-lightbox-player__dark" />
            <div data-player-control="playpause" className="bunny-lightbox-player__playpause">
              <div className="bunny-lightbox-player__big-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__pause-svg">
                  <path d="M16 5V19" stroke="currentColor" strokeWidth="3" strokeMiterlimit="10" />
                  <path d="M8 5V19" stroke="currentColor" strokeWidth="3" strokeMiterlimit="10" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__play-svg">
                  <path d="M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="bunny-lightbox-player__interface">
              <div className="bunny-lightbox-player__interface-fade" />
              <div className="bunny-lightbox-player__interface-bottom">
                <div data-player-control="playpause" className="bunny-lightbox-player__toggle-playpause">
                  <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__pause-svg">
                    <path d="M16 5V19" stroke="currentColor" strokeWidth="3" strokeMiterlimit="10" />
                    <path d="M8 5V19" stroke="currentColor" strokeWidth="3" strokeMiterlimit="10" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__play-svg">
                    <path d="M6 12V5.01109C6 4.05131 7.03685 3.4496 7.87017 3.92579L14 7.42855L20.1007 10.9147C20.9405 11.3945 20.9405 12.6054 20.1007 13.0853L14 16.5714L7.87017 20.0742C7.03685 20.5503 6 19.9486 6 18.9889V12Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="bunny-lightbox-player__time">
                  <p data-player-time-progress className="bunny-lightbox-player__text">00:00</p>
                  <p className="bunny-lightbox-player__text is--transparent">/</p>
                  <p data-player-time-duration className="bunny-lightbox-player__text is--transparent">00:00</p>
                </div>
                <div data-player-timeline className="bunny-lightbox-player__timeline">
                  <div className="bunny-lightbox-player__timeline-bar">
                    <div className="bunny-lightbox-player__timeline-bg" />
                    <div data-player-buffered className="bunny-lightbox-player__timeline-buffered" />
                    <div data-player-progress className="bunny-lightbox-player__timeline-progress" />
                  </div>
                  <div data-player-timeline-handle className="bunny-lightbox-player__timeline-handle" />
                </div>
                <div className="bunny-lightbox-player__interface-btns">
                  <div data-player-control="mute" className="bunny-lightbox-player__toggle-mute">
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__volume-up-svg">
                      <path d="M3 8.99998V15H7L12 20V3.99998L7 8.99998H3ZM16.5 12C16.5 10.23 15.48 8.70998 14 7.96998V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.22998V5.28998C16.89 6.14998 19 8.82998 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.71998 18.01 4.13998 14 3.22998Z" fill="currentColor" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__volume-mute-svg">
                      <path d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V10.18L16.45 12.63C16.48 12.43 16.5 12.22 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18.01 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.52C15.58 18.04 14.83 18.45 14 18.7V20.76C15.38 20.45 16.63 19.81 17.69 18.95L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z" fill="currentColor" />
                    </svg>
                  </div>
                  <div data-player-control="fullscreen" className="bunny-lightbox-player__toggle-fullscreen">
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__fullscreen-scale-svg">
                      <rect x="3" y="14" width="2" height="7" fill="currentColor" /><rect x="3" y="3" width="2" height="7" fill="currentColor" />
                      <rect x="19" y="3" width="2" height="7" fill="currentColor" /><rect x="19" y="14" width="2" height="7" fill="currentColor" />
                      <rect x="3" y="19" width="7" height="2" fill="currentColor" /><rect x="14" y="19" width="7" height="2" fill="currentColor" />
                      <rect x="3" y="3" width="7" height="2" fill="currentColor" /><rect x="14" y="3" width="7" height="2" fill="currentColor" />
                    </svg>
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 24 24" fill="none" className="bunny-lightbox-player__fullscreen-shrink-svg">
                      <rect x="7" y="2" width="2" height="7" fill="currentColor" /><rect x="15" y="2" width="2" height="7" fill="currentColor" />
                      <rect x="15" y="15" width="2" height="7" fill="currentColor" /><rect x="8" y="15" width="2" height="7" fill="currentColor" />
                      <rect x="2" y="7" width="7" height="2" fill="currentColor" /><rect x="3" y="15" width="7" height="2" fill="currentColor" />
                      <rect x="15" y="7" width="7" height="2" fill="currentColor" /><rect x="15" y="15" width="7" height="2" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="bunny-lightbox-player__loading">
              <svg xmlns="http://www.w3.org/2000/svg" version="1.1" x="0px" y="0px" viewBox="0 0 100 100" width="100%" className="bunny-lightbox-player__loading-svg" fill="none">
                <path fill="currentColor" d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50">
                  <animateTransform attributeName="transform" attributeType="XML" type="rotate" dur="1s" from="0 50 50" to="360 50 50" repeatCount="indefinite" />
                </path>
              </svg>
            </div>
          </div>
        </div>
        <button data-bunny-lightbox-control="close" className="bunny-lightbox__close" aria-label="Close video">
          <div className="bunny-lightbox__close-bar" />
          <div className="bunny-lightbox__close-bar is--duplicate" />
        </button>
      </div>
    </div>
  );
};

export default BunnyReelLightbox;
