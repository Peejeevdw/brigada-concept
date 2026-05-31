// Lightweight cross-device settings sync.
//
// Mirrors small UI/config values (e.g. brio presets) to a shared Supabase
// `app_settings` table so edits made on one device show up on another. Purely
// best-effort: localStorage remains the source of truth, and every call fails
// silently if the table or backend is unavailable. The `app_settings` table is
// not part of the generated Supabase types, so the client is cast to `any`.

/** Upsert a single setting value by key. Fire-and-forget; never throws. */
export const pushSetting = async (key: string, value: unknown): Promise<void> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    await (supabase as unknown as {
      from: (t: string) => {
        upsert: (row: Record<string, unknown>) => Promise<unknown>;
      };
    })
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
  } catch {
    // ignore — localStorage already holds the authoritative copy
  }
};

/** Read a single setting value by key, or null if unavailable. */
export const pullSetting = async <T = unknown>(key: string): Promise<T | null> => {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => {
            maybeSingle: () => Promise<{ data: { value: T } | null }>;
          };
        };
      };
    })
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    return data ? data.value : null;
  } catch {
    return null;
  }
};
