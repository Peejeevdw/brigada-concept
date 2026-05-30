/**
 * Shared definitions for the 9 "Brio slot" presets used by the /v3 picker
 * and the /presets editor. Each slot has factory defaults; the editor can
 * override them per-slot via localStorage (`brio-slot-${id}`), and the
 * picker reads the override if present.
 */

export interface BrioSlotSnapshot {
  amount: number;
  brio: { contrast: number; blur: number; grain: number };
  liquid: { speed: number; morph: number; scale: number };
  tempo: number;
  zoom: number;
  clusterColors: number;
}

export interface BrioSlot extends BrioSlotSnapshot {
  id: string;
  label: string;
}

export const BRIO_SLOT_DEFAULTS: BrioSlot[] = [
  // Still image (tempo 0)
  { id: "1", label: "Still·Less", amount: 0.50, brio: { contrast: 0.25, blur: 0.12, grain: 0.25 }, liquid: { speed: 0.00, morph: 0.15, scale: 0.10 }, tempo: 0, zoom: 1.20, clusterColors: 5 },
  { id: "2", label: "Still·Mid",  amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.00, morph: 0.60, scale: 0.27 }, tempo: 0, zoom: 1.50, clusterColors: 5 },
  { id: "3", label: "Still·More", amount: 1.00, brio: { contrast: 0.85, blur: 0.60, grain: 0.70 }, liquid: { speed: 0.00, morph: 1.00, scale: 0.45 }, tempo: 0, zoom: 2.00, clusterColors: 5 },
  // Slow video (tempo 2)
  { id: "4", label: "Slow·Less",  amount: 0.50, brio: { contrast: 0.25, blur: 0.12, grain: 0.25 }, liquid: { speed: 0.20, morph: 0.15, scale: 0.10 }, tempo: 2, zoom: 1.20, clusterColors: 5 },
  { id: "5", label: "Slow·Mid",   amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.20, morph: 0.60, scale: 0.27 }, tempo: 2, zoom: 1.50, clusterColors: 5 },
  { id: "6", label: "Slow·More",  amount: 1.00, brio: { contrast: 0.85, blur: 0.60, grain: 0.70 }, liquid: { speed: 0.20, morph: 1.00, scale: 0.45 }, tempo: 2, zoom: 2.00, clusterColors: 5 },
  // Fast video (tempo 4)
  { id: "7", label: "Fast·Less",  amount: 0.50, brio: { contrast: 0.25, blur: 0.12, grain: 0.25 }, liquid: { speed: 0.50, morph: 0.15, scale: 0.10 }, tempo: 4, zoom: 1.20, clusterColors: 5 },
  { id: "8", label: "Fast·Mid",   amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.50, morph: 0.60, scale: 0.27 }, tempo: 4, zoom: 1.50, clusterColors: 5 },
  { id: "9", label: "Fast·More",  amount: 1.00, brio: { contrast: 0.85, blur: 0.60, grain: 0.70 }, liquid: { speed: 0.50, morph: 1.00, scale: 0.45 }, tempo: 4, zoom: 2.00, clusterColors: 5 },
  // Custom Brio presets
  { id: "10", label: "Brio 01", amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.20, morph: 0.50, scale: 0.20 }, tempo: 0, zoom: 1.50, clusterColors: 5 },
  { id: "11", label: "Brio 02", amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.20, morph: 0.60, scale: 0.27 }, tempo: 0, zoom: 1.50, clusterColors: 5 },
  { id: "12", label: "Brio 03", amount: 0.80, brio: { contrast: 0.55, blur: 0.35, grain: 0.50 }, liquid: { speed: 0.20, morph: 0.80, scale: 0.38 }, tempo: 0, zoom: 1.50, clusterColors: 5 },
];

export const slotStorageKey = (id: string) => `brio-slot-${id}`;

export const loadBrioSlot = (id: string): BrioSlotSnapshot => {
  const def = BRIO_SLOT_DEFAULTS.find((s) => s.id === id) ?? BRIO_SLOT_DEFAULTS[0];
  try {
    const raw = localStorage.getItem(slotStorageKey(id));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<BrioSlotSnapshot>;
      return {
        amount: parsed.amount ?? def.amount,
        brio: { ...def.brio, ...(parsed.brio ?? {}) },
        liquid: { ...def.liquid, ...(parsed.liquid ?? {}) },
        tempo: parsed.tempo ?? def.tempo,
        zoom: parsed.zoom ?? def.zoom,
        clusterColors: parsed.clusterColors ?? def.clusterColors,
      };
    }
  } catch {}
  return {
    amount: def.amount,
    brio: { ...def.brio },
    liquid: { ...def.liquid },
    tempo: def.tempo,
    zoom: def.zoom,
    clusterColors: def.clusterColors,
  };
};

export const saveBrioSlot = (id: string, snap: BrioSlotSnapshot) => {
  try { localStorage.setItem(slotStorageKey(id), JSON.stringify(snap)); } catch {}
};

export const resetBrioSlot = (id: string) => {
  try { localStorage.removeItem(slotStorageKey(id)); } catch {}
};
