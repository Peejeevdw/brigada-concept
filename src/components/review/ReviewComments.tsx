import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useLocation } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

const FALLBACK_SUPABASE_URL = "https://qqytadkdmxnesjlncvkn.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxeXRhZGtkbXhuZXNqbG5jdmtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjkzOTUsImV4cCI6MjA5NDI0NTM5NX0.O8EJTatbIRxZgXR9pYVsbGNgpA7kVk24Nc4IZymow0Y";

const createFallbackSupabase = () =>
  createClient<Database>(FALLBACK_SUPABASE_URL, FALLBACK_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

// Lazily resolve the generated client, but fall back to a direct client if a
// published bundle was built without the backend env values.
let _supabasePromise: Promise<SupabaseClient<Database> | null> | null = null;
const getSupabase = () => {
  if (!_supabasePromise) {
    _supabasePromise = import("@/integrations/supabase/client")
      .then((m) => m.supabase)
      .catch((err) => {
        console.warn("[ReviewComments] generated client unavailable, using fallback", err);
        return createFallbackSupabase();
      });
  }
  return _supabasePromise;
};
import { MessageSquarePlus, X, Check, Trash2, Eye, EyeOff } from "lucide-react";

type Comment = {
  id: string;
  path: string;
  x_pct: number;
  y_pct: number;
  scroll_y_pct: number;
  author: string;
  body: string;
  resolved: boolean;
  created_at: string;
};

const STORAGE_KEY = "review:enabled";
const AUTHOR_KEY = "review:author";

export default function ReviewComments() {
  const { pathname } = useLocation();
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [placing, setPlacing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number; scroll: number } | null>(null);
  const [author, setAuthor] = useState<string>(
    () => (typeof window !== "undefined" && localStorage.getItem(AUTHOR_KEY)) || "Anonymous",
  );
  const [body, setBody] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
    sx: typeof window !== "undefined" ? window.scrollX : 0,
    sy: typeof window !== "undefined" ? window.scrollY : 0,
  }));

  useEffect(() => {
    const update = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight, sx: window.scrollX, sy: window.scrollY });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const computePopoverStyle = (
    markerLeftDoc: number,
    markerTopDoc: number,
    estimatedHeight: number,
  ): React.CSSProperties => {
    const POP_W = 288;
    const M = 8;
    const MARKER_H = 32;
    const sx = markerLeftDoc - vp.sx;
    const sy = markerTopDoc - vp.sy;
    let left = sx - POP_W / 2;
    if (left < M) left = M;
    if (left + POP_W > vp.w - M) left = vp.w - M - POP_W;
    let top = sy + 8;
    if (top + estimatedHeight > vp.h - M) {
      const above = sy - MARKER_H - estimatedHeight - 8;
      top = above >= M ? above : Math.max(M, vp.h - M - estimatedHeight);
    }
    if (top < M) top = M;
    return { position: "fixed", left, top, width: POP_W, transform: "none" };
  };

  // Persist toggle
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  // Fetch + realtime subscribe
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let cleanup: (() => void) | null = null;
    getSupabase().then((supabase) => {
      if (!supabase || !active) return;
      supabase
        .from("review_comments")
        .select("*")
        .eq("path", pathname)
        .order("created_at", { ascending: true })
        .then(({ data }: { data: Comment[] | null }) => {
          if (active && data) setComments(data as Comment[]);
        });

      const channel = supabase
        .channel(`review_comments:${pathname}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "review_comments", filter: `path=eq.${pathname}` },
          (payload: any) => {
            setComments((prev) => {
              if (payload.eventType === "INSERT") return [...prev, payload.new as Comment];
              if (payload.eventType === "UPDATE")
                return prev.map((c) => (c.id === (payload.new as Comment).id ? (payload.new as Comment) : c));
              if (payload.eventType === "DELETE")
                return prev.filter((c) => c.id !== (payload.old as Comment).id);
              return prev;
            });
          },
        )
        .subscribe();

      cleanup = () => supabase.removeChannel(channel);
    });

    return () => {
      active = false;
      if (cleanup) cleanup();
    };
  }, [enabled, pathname]);

  // Keyboard: Shift+R to toggle review mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "R" || e.key === "r") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        if (target && /input|textarea|select/i.test(target.tagName)) return;
        setEnabled((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handlePageClick = (e: MouseEvent) => {
    if (!placing) return;
    e.preventDefault();
    e.stopPropagation();
    const docW = document.documentElement.scrollWidth;
    const docH = document.documentElement.scrollHeight;
    const x = ((e.pageX) / docW) * 100;
    const y = ((e.pageY) / docH) * 100;
    setDraft({ x, y, scroll: window.scrollY });
    setPlacing(false);
  };

  useEffect(() => {
    if (!placing) return;
    const handler = (e: MouseEvent) => handlePageClick(e);
    window.addEventListener("click", handler, { capture: true });
    document.body.style.cursor = "crosshair";
    return () => {
      window.removeEventListener("click", handler, { capture: true } as any);
      document.body.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placing]);

  const submitDraft = async () => {
    if (!draft || !body.trim()) return;
    localStorage.setItem(AUTHOR_KEY, author);
    const supabase = await getSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("review_comments").insert({
      path: pathname,
      x_pct: draft.x,
      y_pct: draft.y,
      scroll_y_pct: 0,
      author: author.trim() || "Anonymous",
      body: body.trim(),
    });
    if (!error) {
      setDraft(null);
      setBody("");
    } else {
      console.error(error);
    }
  };

  const toggleResolved = async (c: Comment) => {
    const supabase = await getSupabase();
    if (!supabase) return;
    await supabase.from("review_comments").update({ resolved: !c.resolved }).eq("id", c.id);
  };
  const remove = async (c: Comment) => {
    const supabase = await getSupabase();
    if (!supabase) return;
    await supabase.from("review_comments").delete().eq("id", c.id);
    if (openId === c.id) setOpenId(null);
  };

  // Floating toggle button (always visible)
  const docH = typeof document !== "undefined" ? document.documentElement.scrollHeight : 0;
  const docW = typeof document !== "undefined" ? document.documentElement.scrollWidth : 0;

  return (
    <>
      {/* Toggle button hidden — use Shift+R to toggle review mode */}


      {!enabled && null}

      {enabled && (
        <>
          {/* Toolbar */}
          <div className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-black/10">
            <button
              type="button"
              onClick={() => setPlacing((v) => !v)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                placing ? "bg-amber-400 text-neutral-900" : "bg-neutral-900 text-white hover:bg-neutral-800"
              }`}
            >
              <MessageSquarePlus className="h-4 w-4" />
              {placing ? "Click anywhere..." : "Add comment"}
            </button>
            <span className="text-xs text-neutral-500">Shift+R to toggle</span>
          </div>

          {/* Markers overlay (absolute over the document) */}
          <div
            ref={overlayRef}
            className="pointer-events-none absolute inset-x-0 top-0 z-[9998]"
            style={{ height: docH }}
          >
            {comments.map((c, i) => {
              const left = (c.x_pct / 100) * docW;
              const top = (c.y_pct / 100) * docH;
              const isOpen = openId === c.id;
              return (
                <div key={c.id} className="absolute" style={{ left, top }}>
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : c.id)}
                    className={`pointer-events-auto -translate-x-1/2 -translate-y-full flex h-8 w-8 items-center justify-center rounded-full rounded-bl-none text-xs font-bold shadow-lg ring-2 ring-white transition ${
                      c.resolved
                        ? "bg-emerald-500 text-white opacity-60 hover:opacity-100"
                        : "bg-amber-400 text-neutral-900 hover:scale-110"
                    }`}
                    aria-label={`Comment ${i + 1}`}
                  >
                    {i + 1}
                  </button>
                  {isOpen && (
                    <div
                      className="pointer-events-auto rounded-lg bg-white p-3 text-sm text-neutral-900 shadow-xl ring-1 ring-black/10 z-[10000]"
                      style={computePopoverStyle(left, top, 200)}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-medium text-neutral-700">{c.author}</span>
                        <span>{new Date(c.created_at).toLocaleString()}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
                      <div className="mt-2 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => toggleResolved(c)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {c.resolved ? "Reopen" : "Resolve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(c)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Draft marker */}
            {draft && (
              <div
                className="absolute"
                style={{ left: (draft.x / 100) * docW, top: (draft.y / 100) * docH }}
              >
                <div className="pointer-events-auto -translate-x-1/2 -translate-y-full">
                  <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-full rounded-bl-none bg-amber-400 text-xs font-bold shadow-lg ring-2 ring-white">
                    +
                  </div>
                </div>
                <div
                  className="pointer-events-auto rounded-lg bg-white p-3 shadow-xl ring-1 ring-black/10 z-[10000]"
                  style={computePopoverStyle((draft.x / 100) * docW, (draft.y / 100) * docH, 280)}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <input
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      placeholder="Your name"
                      maxLength={100}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(null);
                        setBody("");
                      }}
                      className="ml-1 rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    autoFocus
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Leave a comment..."
                    maxLength={2000}
                    rows={3}
                    className="w-full resize-none rounded border border-neutral-200 px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-400"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={submitDraft}
                      disabled={!body.trim()}
                      className="rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-800 disabled:opacity-40"
                    >
                      Post comment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
