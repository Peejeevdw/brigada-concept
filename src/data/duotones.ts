// Duotone palette pairs used by the v4 Hero scroll transition.
// Each pair: `a` becomes the dominant tint, `b` is the shadow/offset tone.

export type Duotone = {
  id: string;
  name: string;
  a: string; // primary tint (lighter / brand)
  b: string; // secondary tint (shadow)
};

// Quadtones: 7-stop gradient maps (shadow → highlight) for the "brio" effect.
// Inspired by the Feeld brio visual: deep accent fading through warm mids
// into a luminous highlight tone. The 7 stops are anchored on the 4 original
// brand colors at positions 1/3/5/7, with linear midpoints at 2/4/6.
export type QuadtoneStops = [string, string, string, string, string, string, string];

export type Quadtone = {
  id: string;
  name: string;
  /** Ordered shadow → highlight. Exactly 7 stops. */
  stops: QuadtoneStops;
};

// --- internal hex helpers used both for palette midpoints and for migrating
// legacy 4-stop overrides to the new 7-stop model. ---
const _hexByte = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
const _toHex2 = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
const hexMix = (a: string, b: string): string => {
  const r = (_hexByte(a, 1) + _hexByte(b, 1)) / 2;
  const g = (_hexByte(a, 3) + _hexByte(b, 3)) / 2;
  const bl = (_hexByte(a, 5) + _hexByte(b, 5)) / 2;
  return ("#" + _toHex2(r) + _toHex2(g) + _toHex2(bl)).toUpperCase();
};
/** Expand a legacy 4-stop palette to the 7-stop model by inserting midpoints. */
export const expandStops4to7 = (s: readonly string[]): QuadtoneStops => {
  const safe = (i: number) => s[i] ?? s[s.length - 1] ?? "#000000";
  const a = safe(0), b = safe(1), c = safe(2), d = safe(3);
  return [a, hexMix(a, b), b, hexMix(b, c), c, hexMix(c, d), d];
};

export const quadtones: Quadtone[] = [
  {
    id: "brio-05",
    name: "Brio 01 Purple & Red",
    // shadow (green) → orange → magenta → highlight (lavender)
    stops: expandStops4to7(["#2E9E47", "#E8401C", "#E8329C", "#C9C9F5"]),
  },
  {
    id: "brio-06",
    name: "Brio 02 Red & Pink",
    // Deep plum → burnt sienna → sand → bone
    stops: expandStops4to7(["#2A1230", "#9B3A1E", "#D6A06A", "#F2E6D0"]),
  },
  {
    id: "brio-01",
    name: "Brio 03 Pink & Yellow",
    // Ink (body) → cream (bg), interpolated through 7 stops.
    stops: expandStops4to7(["#1F1B16", "#6E6552", "#BDB29A", "#F3F2EF"]),
  },
  {
    id: "brio-04",
    name: "Brio 04 Yellow & Green",
    // Ink Black → Spicy Orange → Toasted Almond → Baby Blue Ice
    stops: expandStops4to7(["#0B0F1A", "#C45A2D", "#E38B5B", "#7FAEFF"]),
  },
  {
    id: "brio-03",
    name: "Brio 05 Green & Blue",
    // Indigo, blue, cyan, teal, mint, soft green, cream (sampled from gradient)
    stops: ["#4A2BD9", "#4D7BFF", "#3FB8E8", "#36D4B4", "#5EEA8A", "#B8F2C8", "#F2EFD9"],
  },
  {
    id: "brio-07",
    name: "Brio 06 Blue & Orange",
    // Deep navy → blue → light blue → cream → peach → orange → burnt orange
    stops: ["#0A1A3D", "#1E4FA8", "#4D8FE0", "#E8D8C4", "#F2B57A", "#E88A3C", "#B85420"],
  },
  {
    id: "brio-02",
    name: "Brio 07 Orange & Purple",
    // Orange → coral → magenta → purple → indigo (sampled from gradient)
    stops: ["#F9A03A", "#EE6A4D", "#D94A7E", "#C73E9E", "#A93BBE", "#7A37D4", "#4A2BD9"],
  },
  {
    id: "brio-08",
    name: "Brio 08 Rainbow",
    // Orange → pink/magenta → purple → blue → cyan → mint/teal → coral red
    stops: ["#F2A03C", "#E84B8A", "#B14CD6", "#3A4ED8", "#2FB6F0", "#3FD9C8", "#F0524A"],
  },
];


export const DEFAULT_QUADTONE_ID = "brio-01";

export const isQuadtoneId = (id: string) => quadtones.some((q) => q.id === id);

// ---------------------------------------------------------------------------
// Per-palette stop overrides (user-edited colors saved in localStorage)
// ---------------------------------------------------------------------------

export const QUADTONE_STOPS_OVERRIDES_STORAGE_KEY = "brigada.quadtone.stops.overrides";

const isHex = (s: unknown): s is string =>
  typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);

const getQuadtoneStopsOverrides = (): Record<string, QuadtoneStops> => {
  try {
    const raw = localStorage.getItem(QUADTONE_STOPS_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, QuadtoneStops> = {};
    for (const [id, stops] of Object.entries(parsed)) {
      if (!Array.isArray(stops) || !stops.every(isHex)) continue;
      if (stops.length === 7) {
        out[id] = [stops[0], stops[1], stops[2], stops[3], stops[4], stops[5], stops[6]] as QuadtoneStops;
      } else if (stops.length === 4) {
        // Legacy 4-stop override: expand to 7 via midpoint interpolation.
        out[id] = expandStops4to7(stops as string[]);
      }
    }
    return out;
  } catch {
    return {};
  }
};

export const saveQuadtoneStops = (id: string, stops: QuadtoneStops) => {
  try {
    if (!stops.every(isHex)) return;
    const all = getQuadtoneStopsOverrides();
    all[id] = stops;
    localStorage.setItem(QUADTONE_STOPS_OVERRIDES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("brio-palette-changed"));
    // Persist to the shared database (best-effort, fire and forget).
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        // `palette_overrides` is not in the generated Supabase types; cast to
        // keep this best-effort sync type-safe. Fails silently if absent.
        await (supabase as any)
          .from("palette_overrides")
          .upsert({ palette_id: id, stops, updated_at: new Date().toISOString() });
      } catch {}
    })();
  } catch {}
};

export const resetQuadtoneStops = (id: string) => {
  try {
    const all = getQuadtoneStopsOverrides();
    delete all[id];
    localStorage.setItem(QUADTONE_STOPS_OVERRIDES_STORAGE_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent("brio-palette-changed"));
    void (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await (supabase as any).from("palette_overrides").delete().eq("palette_id", id);
      } catch {}
    })();
  } catch {}
};

/** Load all palette overrides from the shared database into local cache. */
export const loadQuadtoneOverridesFromDb = async () => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await (supabase as any)
      .from("palette_overrides")
      .select("palette_id, stops");
    if (error || !data) return;
    const merged: Record<string, QuadtoneStops> = {};
    for (const row of data as { palette_id: string; stops: unknown }[]) {
      const s = row.stops as unknown;
      if (!Array.isArray(s) || !s.every(isHex)) continue;
      if (s.length === 7) {
        merged[row.palette_id] = [s[0], s[1], s[2], s[3], s[4], s[5], s[6]] as QuadtoneStops;
      } else if (s.length === 4) {
        merged[row.palette_id] = expandStops4to7(s as string[]);
      }
    }
    localStorage.setItem(QUADTONE_STOPS_OVERRIDES_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("brio-palette-changed"));
  } catch {}
};



/** Returns the quadtone with any user-saved stop overrides applied. */
export const getEffectiveQuadtone = (id: string): Quadtone | undefined => {
  const base = quadtones.find((q) => q.id === id);
  if (!base) return undefined;
  const override = getQuadtoneStopsOverrides()[id];
  return override ? { ...base, stops: override } : base;
};

/** All quadtones with user overrides applied. */
export const getEffectiveQuadtones = (): Quadtone[] => {
  const overrides = getQuadtoneStopsOverrides();
  return quadtones.map((q) => (overrides[q.id] ? { ...q, stops: overrides[q.id] } : q));
};

export const duotones: Duotone[] = [
  { id: "pink-green",   name: "Pink / Green",      a: "#f0c7e8", b: "#178f1f" },
  { id: "ochre-mauve",  name: "Ochre / Mauve",     a: "#c69a4a", b: "#7e7480" },
  { id: "yellow-blue",  name: "Yellow / Steel",    a: "#f5e21a", b: "#3d6a8a" },
  { id: "blue-brown",   name: "Sky / Cocoa",       a: "#5e9ad1", b: "#6b5a4d" },
  { id: "lilac-teal",   name: "Lilac / Teal",      a: "#d6c8d4", b: "#6c8588" },
  { id: "periwinkle-peach", name: "Periwinkle / Peach", a: "#aabaf0", b: "#e8a06c" },
  { id: "lime-khaki",   name: "Lime / Khaki",      a: "#9ed81c", b: "#a99966" },
  { id: "orange-navy",  name: "Orange / Navy",     a: "#e9501a", b: "#1d2a78" },
  { id: "pink-forest",  name: "Pink / Forest",     a: "#e9a6e8", b: "#1f4438" },
];

export const DUOTONE_STORAGE_KEY = "brigada.duotone.mode"; // "random" | <id>
export const DUOTONE_RANDOM = "random";
export const DUOTONE_DEFAULT = "brio-one";

const hexToRgb01 = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export const getActivePaletteMode = (): string => {
  try {
    return localStorage.getItem(DUOTONE_STORAGE_KEY) || DUOTONE_DEFAULT;
  } catch {
    return DUOTONE_DEFAULT;
  }
};

export const pickDuotone = (): Duotone => {
  const mode = getActivePaletteMode();
  if (mode !== DUOTONE_RANDOM) {
    const found = duotones.find((d) => d.id === mode);
    if (found) return found;
    // Quadtone selected: fall back to default duotone for consumers that
    // don't yet support quadtones (callers that do should branch on the mode).
  }
  return duotones[Math.floor(Math.random() * duotones.length)];
};

export const pickQuadtone = (): Quadtone | null => {
  const mode = getActivePaletteMode();
  const found = quadtones.find((q) => q.id === mode);
  return found || null;
};

// Convert a duotone into the tint matrix the Hero filter expects.
// Mirrors the original pink/green math: rO,gO,bO offsets + per-channel scale.
export const duotoneToTintMatrix = (d: Duotone) => {
  const [rA, gA, bA] = hexToRgb01(d.a);
  const [rB, gB, bB] = hexToRgb01(d.b);
  // scale = a-channel weight, offset = b color baseline.
  // Duotone mapping: dark pixels => color B, bright pixels => color A.
  // Per channel: out = (A - B) * in + B
  return {
    rScale: rA - rB, rOffset: rB,
    gScale: gA - gB, gOffset: gB,
    bScale: bA - bB, bOffset: bB,
  };
};

// ---------------------------------------------------------------------------
// Brio settings (per-stop thresholds + grain)
// ---------------------------------------------------------------------------

export type BrioToggles = {
  color: boolean;
};

export type BrioThresholds = [number, number, number, number, number, number];

export type BrioSettings = {
  /**
   * 6 ascending luminance positions (0..1) defining color band edges:
   *   color 1: 0       → t[0]
   *   gradient: t[0]   → t[1]
   *   color 2: t[1]    → t[2]
   *   gradient: t[2]   → t[3]
   *   color 3: t[3]    → t[4]
   *   gradient: t[4]   → t[5]
   *   color 4: t[5]    → 1
   */
  thresholds: BrioThresholds;
  /** Grain opacity multiplier (0..2). 0 = no grain. */
  grain: number;
  /** Blur amount (0 = off, 1 = full). Scales the Gaussian blur stdDeviation. */
  blur: number;
  /** Contrast amount (0 = off, 1 = full). Scales the contrast crush. */
  contrast: number;
  /** Warp amount (0 = none, 1 = default, up to 2 = extreme). */
  warp: number;
  /** Liquify amount (0 = none, 1 = default, up to 2 = extreme). Slow, organic, low-frequency distortion. */
  liquify: number;
  /** Per-effect on/off switches for the remaining steps. */
  toggles: BrioToggles;
  /** Legacy fields preserved for backward compatibility with older callers
   *  (home-v4 hero, ReelPreview, experiment pages). Not used by the locked
   *  BrioEffect package, which passes mesh/lava config via dedicated props. */
  zoom?: number;
  wave?: number;
  tempo?: number;
  amount?: number;
  cluster?: any;
  liquidFlow?: any;
};

export const BRIO_SETTINGS_STORAGE_KEY = "brigada.brio.settings";

export const DEFAULT_BRIO_TOGGLES: BrioToggles = {
  color: true,
};

export const DEFAULT_BRIO_SETTINGS: BrioSettings = {
  thresholds: [0.20, 0.30, 0.45, 0.55, 0.70, 0.80],
  grain: 1,
  blur: 1,
  contrast: 1,
  warp: 1,
  liquify: 0,
  toggles: DEFAULT_BRIO_TOGGLES,
};

// ---------------------------------------------------------------------------
// Brio presets (intensity)
// ---------------------------------------------------------------------------

export type BrioPresetId = "soft" | "medium" | "strong";

export type BrioPreset = {
  id: BrioPresetId;
  name: string;
  settings: BrioSettings;
};

export const BRIO_PRESETS: BrioPreset[] = [
  {
    id: "soft",
    name: "Less",
    settings: {
      thresholds: [0.15, 0.40, 0.50, 0.60, 0.70, 0.85],
      grain: 0.4,
      blur: 0.35,
      contrast: 0.35,
      warp: 0.3,
      liquify: 0,
      toggles: DEFAULT_BRIO_TOGGLES,
    },
  },
  {
    id: "medium",
    name: "Mid",
    settings: {
      thresholds: [0.20, 0.30, 0.45, 0.55, 0.70, 0.80],
      grain: 1,
      blur: 0.6,
      contrast: 0.7,
      warp: 1,
      liquify: 0,
      toggles: DEFAULT_BRIO_TOGGLES,
    },
  },
  {
    id: "strong",
    name: "More",
    settings: {
      thresholds: [0.22, 0.28, 0.45, 0.55, 0.72, 0.78],
      grain: 1.4,
      blur: 0.9,
      contrast: 1,
      warp: 1.6,
      liquify: 0,
      toggles: DEFAULT_BRIO_TOGGLES,
    },
  },
];

export const DEFAULT_BRIO_PRESET_ID: BrioPresetId = "medium";

export const BRIO_PRESET_STORAGE_KEY = "brigada.brio.preset";
export const BRIO_PRESET_OVERRIDES_STORAGE_KEY = "brigada.brio.preset.overrides";

type PresetOverridesByPalette = Record<string, Partial<Record<BrioPresetId, BrioSettings>>>;

const getAllPresetOverrides = (): PresetOverridesByPalette => {
  try {
    const raw = localStorage.getItem(BRIO_PRESET_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: PresetOverridesByPalette = {};
    // Detect & migrate the legacy shape: { soft|medium|strong: BrioSettings }
    const legacyKeys = ["soft", "medium", "strong"] as const;
    const looksLegacy = legacyKeys.some((k) => k in parsed) && !legacyKeys.some((k) => parsed[k] && typeof parsed[k] === "object" && !("thresholds" in parsed[k]));
    if (looksLegacy) {
      out.__global__ = {};
      legacyKeys.forEach((id) => {
        if (parsed[id]) out.__global__![id] = sanitizeBrioSettings(parsed[id]);
      });
      return out;
    }
    Object.keys(parsed).forEach((paletteId) => {
      const entry = parsed[paletteId];
      if (!entry || typeof entry !== "object") return;
      const perPreset: Partial<Record<BrioPresetId, BrioSettings>> = {};
      legacyKeys.forEach((id) => {
        if (entry[id]) perPreset[id] = sanitizeBrioSettings(entry[id]);
      });
      out[paletteId] = perPreset;
    });
    return out;
  } catch {
    return {};
  }
};

const getPresetOverridesFor = (paletteId: string): Partial<Record<BrioPresetId, BrioSettings>> => {
  const all = getAllPresetOverrides();
  return all[paletteId] ?? all.__global__ ?? {};
};

export const getBrioPreset = (id: BrioPresetId, paletteId?: string): BrioPreset => {
  const base = BRIO_PRESETS.find((p) => p.id === id) ?? BRIO_PRESETS[1];
  const overrides = paletteId ? getPresetOverridesFor(paletteId) : {};
  const override = overrides[id];
  return override ? { ...base, settings: override } : base;
};

export const saveBrioPresetSettings = (id: BrioPresetId, settings: BrioSettings, paletteId: string) => {
  try {
    const all = getAllPresetOverrides();
    const entry = all[paletteId] ?? {};
    entry[id] = sanitizeBrioSettings(settings);
    all[paletteId] = entry;
    localStorage.setItem(BRIO_PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(all));
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.preset.overrides", all),
    );
  } catch {}
};

export const resetBrioPresetSettings = (id: BrioPresetId, paletteId: string) => {
  try {
    const all = getAllPresetOverrides();
    if (all[paletteId]) {
      delete all[paletteId]![id];
      if (Object.keys(all[paletteId]!).length === 0) delete all[paletteId];
    }
    localStorage.setItem(BRIO_PRESET_OVERRIDES_STORAGE_KEY, JSON.stringify(all));
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.preset.overrides", all),
    );
  } catch {}
};

export const getActiveBrioPresetId = (): BrioPresetId => {
  try {
    const v = localStorage.getItem(BRIO_PRESET_STORAGE_KEY);
    if (v === "soft" || v === "medium" || v === "strong") return v;
  } catch {}
  return DEFAULT_BRIO_PRESET_ID;
};

export const saveActiveBrioPresetId = (id: BrioPresetId) => {
  try {
    localStorage.setItem(BRIO_PRESET_STORAGE_KEY, id);
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.preset.active", id),
    );
  } catch {}
};

const sanitizeToggles = (raw: unknown): BrioToggles => {
  const def = DEFAULT_BRIO_TOGGLES;
  if (!raw || typeof raw !== "object") return { ...def };
  const r = raw as Partial<BrioToggles>;
  return {
    color: typeof r.color === "boolean" ? r.color : def.color,
  };
};

const clamp01 = (n: unknown, fallback: number) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(1, v));
};

const sanitizeBrioSettings = (raw: unknown): BrioSettings => {
  const def = DEFAULT_BRIO_SETTINGS;
  if (!raw || typeof raw !== "object") return def;
  const r = raw as Partial<BrioSettings> & {
    toggles?: unknown;
    blur?: unknown;
    contrast?: unknown;
  };
  // Accept new 6-tuple, or migrate legacy 4-tuple by expanding each old
  // boundary into a tight start/end pair so existing users see no jump.
  let t: number[];
  const rawT = r.thresholds as unknown;
  if (Array.isArray(rawT) && rawT.length === 6) {
    t = rawT.map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
  } else if (Array.isArray(rawT) && rawT.length === 4) {
    const old = rawT.map((v) => Math.max(0, Math.min(1, Number(v) || 0)));
    // Old model: t[1..3] were the band edges. Map to [t1, t1, t2, t2, t3, t3].
    t = [old[1], old[1], old[2], old[2], old[3], old[3]];
  } else {
    t = def.thresholds.slice();
  }
  // Ensure ascending so the LUT is monotonic.
  for (let i = 1; i < t.length; i++) if (t[i] < t[i - 1]) t[i] = t[i - 1];
  for (let i = t.length - 2; i >= 0; i--) if (t[i] > t[i + 1]) t[i] = t[i + 1];
  const grain = Math.max(0, Math.min(2, Number(r.grain ?? def.grain) || 0));

  // Migrate legacy boolean blur/contrast/warp (from previous toggles model)
  // into the new amount-based fields.
  const legacyToggles = (r.toggles && typeof r.toggles === "object")
    ? (r.toggles as { blur?: unknown; contrast?: unknown; warp?: unknown })
    : {};
  const blurRaw = r.blur ?? (typeof legacyToggles.blur === "boolean" ? (legacyToggles.blur ? 1 : 0) : def.blur);
  const contrastRaw = r.contrast ?? (typeof legacyToggles.contrast === "boolean" ? (legacyToggles.contrast ? 1 : 0) : def.contrast);
  const warpRaw = (r as { warp?: unknown }).warp
    ?? (typeof legacyToggles.warp === "boolean" ? (legacyToggles.warp ? 1 : 0) : def.warp);
  const warp = Math.max(0, Math.min(2, Number(warpRaw) || 0));
  const liquifyRaw = (r as { liquify?: unknown }).liquify ?? def.liquify;
  const liquify = Math.max(0, Math.min(2, Number(liquifyRaw) || 0));

  return {
    thresholds: [t[0], t[1], t[2], t[3], t[4], t[5]],
    grain,
    blur: clamp01(blurRaw, def.blur),
    contrast: clamp01(contrastRaw, def.contrast),
    warp,
    liquify,
    toggles: sanitizeToggles(r.toggles),
  };
};

export const BRIO_DEFAULT_OVERRIDE_STORAGE_KEY = "brigada.brio.default";

export const getDefaultBrioSettings = (): BrioSettings => {
  try {
    const raw = localStorage.getItem(BRIO_DEFAULT_OVERRIDE_STORAGE_KEY);
    if (!raw) return DEFAULT_BRIO_SETTINGS;
    return sanitizeBrioSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_BRIO_SETTINGS;
  }
};

export const saveDefaultBrioSettings = (s: BrioSettings) => {
  try {
    const sanitized = sanitizeBrioSettings(s);
    localStorage.setItem(
      BRIO_DEFAULT_OVERRIDE_STORAGE_KEY,
      JSON.stringify(sanitized),
    );
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.default.override", sanitized),
    );
  } catch {}
};

export const clearDefaultBrioSettings = () => {
  try {
    localStorage.removeItem(BRIO_DEFAULT_OVERRIDE_STORAGE_KEY);
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.default.override", null),
    );
  } catch {}
};

export const getBrioSettings = (): BrioSettings => {
  try {
    const raw = localStorage.getItem(BRIO_SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultBrioSettings();
    return sanitizeBrioSettings(JSON.parse(raw));
  } catch {
    return getDefaultBrioSettings();
  }
};

export const saveBrioSettings = (s: BrioSettings) => {
  try {
    const sanitized = sanitizeBrioSettings(s);
    localStorage.setItem(BRIO_SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));
    void import("@/lib/appSettings").then(({ pushSetting }) =>
      pushSetting("brio.settings", sanitized),
    );
  } catch {}
};

// ---------------------------------------------------------------------------
// Quadtone LUT
// ---------------------------------------------------------------------------

const LUT_SAMPLES = 65; // resolution of the resampled tableValues

// Build per-channel `tableValues` strings for a quadtone gradient map.
//
// 6-handle model: each color has an explicit start/end, with linear gradient
// transitions between adjacent colors in the gap regions.
//   color 0: [0,    t[0]]   solid
//   trans:   [t[0], t[1]]   color 0 -> color 1 gradient
//   color 1: [t[1], t[2]]   solid
//   trans:   [t[2], t[3]]   color 1 -> color 2 gradient
//   color 2: [t[3], t[4]]   solid
//   trans:   [t[4], t[5]]   color 2 -> color 3 gradient
//   color 3: [t[5], 1]      solid
//
// `amount` blends with the identity ramp so 0 = clean image, 1 = full effect.
export const quadtoneToTableValues = (
  q: Quadtone,
  amount = 1,
  thresholds: BrioThresholds = DEFAULT_BRIO_SETTINGS.thresholds,
) => {
  const stops = q.stops.map(hexToRgb01) as [number, number, number][];
  const a = Math.max(0, Math.min(1, amount));

  const t = thresholds.map((v) => Math.max(0, Math.min(1, v))).sort((x, y) => x - y);

  const lerpC = (
    c0: [number, number, number],
    c1: [number, number, number],
    u: number,
  ): [number, number, number] => [
    c0[0] + (c1[0] - c0[0]) * u,
    c0[1] + (c1[1] - c0[1]) * u,
    c0[2] + (c1[2] - c0[2]) * u,
  ];

  const sampleColor = (x: number): [number, number, number] => {
    if (x <= t[0]) return stops[0];
    if (x < t[1]) {
      const span = t[1] - t[0];
      const u = span <= 0 ? 1 : (x - t[0]) / span;
      return lerpC(stops[0], stops[1], u);
    }
    if (x <= t[2]) return stops[1];
    if (x < t[3]) {
      const span = t[3] - t[2];
      const u = span <= 0 ? 1 : (x - t[2]) / span;
      return lerpC(stops[1], stops[2], u);
    }
    if (x <= t[4]) return stops[2];
    if (x < t[5]) {
      const span = t[5] - t[4];
      const u = span <= 0 ? 1 : (x - t[4]) / span;
      return lerpC(stops[2], stops[3], u);
    }
    return stops[3];
  };

  const channel = (idx: 0 | 1 | 2) => {
    const out: string[] = [];
    for (let i = 0; i < LUT_SAMPLES; i++) {
      const x = i / (LUT_SAMPLES - 1);
      const target = sampleColor(x)[idx];
      // Identity ramp = x itself (passthrough), blend toward target by `a`.
      const v = x + (target - x) * a;
      out.push(v.toFixed(4));
    }
    return out.join(" ");
  };

  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
  };
};

// Identity LUT for `feComponentTransfer type="table"` at LUT_SAMPLES resolution.
export const IDENTITY_TABLE = Array.from({ length: LUT_SAMPLES }, (_, i) =>
  (i / (LUT_SAMPLES - 1)).toFixed(4)
).join(" ");

// Luminance grayscale matrix (Rec. 709). Used as the input ramp for the
// quadtone LUT so all three channels see the same value.
export const LUMINANCE_MATRIX =
  "0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0.2126 0.7152 0.0722 0 0 0 0 0 1 0";
