"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { runPageTransition } from "@/lib/pageTransition";
import { SANS, EASE_OUT } from "@/lib/siteTokens";
import { useSiteChrome } from "@/lib/site-chrome";

// Shared navigation for the new-style pages — the /concept nav (progressive
// blur backdrop + Expertise hover-dropdown), arranged as a left group · centred
// Brigada wordmark · right group. Extracted from the per-page copies in
// Brand/BrandV2/CareersV2/AboutV2/EmployerBranding so there's one source.
//
// The progressive-blur CSS lives globally in index.css.

// A resolved nav entry. Built from the Sanity `main` menu (label, url,
// internal/external, optional one-level submenu). Falls back to FALLBACK_NAV
// below when the menu is empty/unreachable.
type NavLink = {
  label: string;
  url?: string;
  external?: boolean;
  openInNewTab?: boolean;
  submenu?: NavLink[];
};

// Transitional dropdowns: if a Sanity top-level item points here but has no
// submenu of its own yet, fall back to these so the dropdown doesn't vanish
// before the editor fills it in. A Sanity-authored submenu always wins.
const DEFAULT_SUBMENUS: Record<string, NavLink[]> = {
  "/services": [
    { label: "Brand", url: "/brand" },
    { label: "Marketing", url: "/marketing" },
    { label: "People", url: "/people" },
    { label: "Product", url: "/product" },
  ],
};

// Used only when the Sanity `main` menu is empty/unreachable, so the chrome
// never renders an empty nav in production.
const FALLBACK_NAV: NavLink[] = [
  { label: "Services", url: "/services", submenu: DEFAULT_SUBMENUS["/services"] },
  { label: "Work", url: "/work" },
  { label: "About", url: "/about" },
  { label: "Careers", url: "/careers" },
  { label: "Contact", url: "/contact" },
];

// One nav entry (label + optional hover dropdown).
const NavItem = ({
  item,
  openLabel,
  openMenu,
  scheduleClose,
  alignRight,
  onNavigate,
  onPrefetch,
  // When true the hover dropdown is suppressed (the label still navigates).
  // Used on the service-pillar pages, where the tab bar already lists the
  // Services sub-items, so the dropdown would be redundant.
  disabled = false,
}: {
  item: NavLink;
  openLabel: string | null;
  openMenu: (label: string) => void;
  scheduleClose: () => void;
  alignRight: boolean;
  onNavigate: (link: NavLink) => void;
  onPrefetch: (link: NavLink) => void;
  disabled?: boolean;
}) => {
  const submenu = item.submenu ?? [];
  return (
    <div
      className="relative flex items-center px-5 -mx-5"
      onMouseEnter={
        disabled
          ? undefined
          : () => {
              openMenu(item.label);
              onPrefetch(item);
            }
      }
      onMouseLeave={disabled ? undefined : scheduleClose}
    >
      <span
        className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
        style={{ fontFamily: SANS }}
        onClick={() => onNavigate(item)}
      >
        {item.label}
      </span>
      <AnimatePresence>
        {!disabled && openLabel === item.label && submenu.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className={`absolute top-full pt-2 ${alignRight ? "right-5" : "left-5"}`}
          >
            <ul className="flex flex-row items-center gap-[clamp(32px,4vw,80px)] whitespace-nowrap">
              {submenu.map((sub) => (
                <li key={sub.label}>
                  <button
                    type="button"
                    onClick={() => onNavigate(sub)}
                    onMouseEnter={() => onPrefetch(sub)}
                    className="block text-[14px] uppercase leading-[20px] tracking-[1.4px] opacity-90 transition-opacity hover:opacity-60"
                    style={{ fontFamily: SANS }}
                  >
                    {sub.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// textClassName — tailwind colour for the nav (most pages: dark text on a light
// page; AboutV2 uses white). homePath — where the centred wordmark goes.
// navTargets — extend/override the default routing map.
const SiteNav = ({
  textClassName = "text-brigada-black",
  homePath = "/concept",
  navTargets,
  blend = true,
  lockedDropdowns = [],
}: {
  textClassName?: string;
  homePath?: string;
  navTargets?: Record<string, string>;
  // When set (default), the nav renders white with mix-blend-mode: difference so
  // it stays legible over any background (light/dark hero, photo, video). Set
  // false to fall back to the explicit `textClassName` colour.
  blend?: boolean;
  // Top-level labels whose hover dropdown should NOT open (the label still
  // navigates). Used on the service-pillar pages to suppress "Services", which
  // the tab bar already covers.
  lockedDropdowns?: string[];
} = {}) => {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Navigate via the page-transition store (not the React context) so SiteNav
  // works both inside the crossfade and when mounted as persistent chrome
  // OUTSIDE it (the steady service-pillar nav).
  const router = useRouter();

  // The progressive-blur backdrop and the nav extend up into the iOS status-bar
  // safe area so the frosted bar "runs behind" the native top bar. Relies on
  // `viewport-fit=cover` (set in app/layout.tsx) for env(safe-area-inset-top) to
  // resolve nonzero; it's 0 on desktop, so the calc()s collapse to the base.

  // Lock body scroll while the full-screen mobile menu is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Hover-intent for the submenu: a short close delay so moving between a label
  // and its submenu (or just past the label) doesn't snap it shut. Re-entering
  // a nav item cancels the pending close.
  const navCloseTimer = useRef<number | null>(null);
  const openMenu = (label: string) => {
    if (navCloseTimer.current !== null) {
      window.clearTimeout(navCloseTimer.current);
      navCloseTimer.current = null;
    }
    setOpenLabel(label);
  };
  const scheduleMenuClose = () => {
    if (navCloseTimer.current !== null) window.clearTimeout(navCloseTimer.current);
    navCloseTimer.current = window.setTimeout(() => {
      setOpenLabel(null);
      navCloseTimer.current = null;
    }, 180);
  };

  // The nav is driven by the Sanity `main` menu: labels, order, destinations
  // (internal page or external URL) and an optional one-level dropdown all come
  // from there. FALLBACK_NAV only kicks in when the menu is empty/unreachable.
  // `navTargets` (legacy per-page override map) still overrides a label's URL.
  const chrome = useSiteChrome();
  const navItems = useMemo<NavLink[]>(() => {
    const items = chrome?.mainMenu?.items ?? [];
    const source: NavLink[] =
      items.length > 0
        ? items
            .filter((it) => it?.label)
            .map((it) => {
              const authored = (it.submenu ?? [])
                .filter((s) => s?.label && s?.url)
                .map((s) => ({
                  label: s.label,
                  url: s.url ?? undefined,
                  external: s.external,
                  openInNewTab: s.openInNewTab,
                }));
              const fallbackSub = it.url ? DEFAULT_SUBMENUS[it.url] : undefined;
              return {
                label: it.label,
                url: it.url ?? undefined,
                external: it.external,
                openInNewTab: it.openInNewTab,
                submenu: authored.length > 0 ? authored : fallbackSub,
              };
            })
        : FALLBACK_NAV;
    // Apply legacy per-page URL overrides (matched by label) as internal routes.
    if (!navTargets) return source;
    return source.map((item) =>
      navTargets[item.label]
        ? { ...item, url: navTargets[item.label], external: false, openInNewTab: false }
        : item
    );
  }, [chrome?.mainMenu?.items, navTargets]);

  // Route an internal app path through the crossfade; send external links (or
  // "open in new tab", mailto/tel/anchor) out via a normal navigation.
  const isAppRoute = (link: NavLink) =>
    !!link.url && link.url.startsWith("/") && !link.external;
  const navigate = (link: NavLink) => {
    setMobileOpen(false);
    if (!link.url) return;
    if (link.openInNewTab) {
      window.open(link.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (isAppRoute(link)) runPageTransition(link.url!);
    else window.location.href = link.url;
  };
  // Warm internal routes on hover so the click commits near-instantly.
  const prefetch = (link: NavLink) => {
    if (isAppRoute(link) && !link.openInNewTab) router.prefetch(link.url!);
  };

  const blurOpen = navItems.some(
    (i) => i.label === openLabel && (i.submenu?.length ?? 0) > 0
  );

  // Blend keeps the nav legible over any background, but we drop it while the
  // full-screen mobile menu is open so the labels stay crisp white on black.
  const useBlend = blend && !mobileOpen;

  return (
    <>
    {/* Progressive-blur backdrop — its own fixed layer (z-40), kept OUT of the
        nav so it never sits between the blended nav and the page content. */}
    <motion.div
      className="fixed inset-x-0 top-0 z-40 pointer-events-none"
      aria-hidden
      initial={{ y: "-100%" }}
      animate={{ y: "0%" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
    >
      <div className={`progressive-blur${blurOpen ? " is--open" : ""}`}>
        <div className="progressive-blur__layer is--1" />
        <div className="progressive-blur__layer is--2" />
        <div className="progressive-blur__layer is--3" />
        <div className="progressive-blur__layer is--4" />
        <div className="progressive-blur__layer is--5" />
      </div>
    </motion.div>

    {/* Nav — IS the fixed, blended element (no transformed/opacity wrapper in
        between), so mix-blend-difference reaches the page content behind it. The
        entrance slides via `top` rather than transform, so the blended element
        itself carries no transform that could re-isolate it. */}
    <motion.nav
        className={`fixed inset-x-0 z-50 flex h-[calc(72px+env(safe-area-inset-top,0px))] max-md:h-[calc(86px+env(safe-area-inset-top,0px))] items-stretch justify-between px-[clamp(24px,5vw,72px)] pt-[env(safe-area-inset-top,0px)] max-md:pt-[calc(14px+env(safe-area-inset-top,0px))] ${useBlend ? "text-white" : textClassName} ${mobileOpen ? "max-md:!text-white" : ""}`}
        style={useBlend ? { mixBlendMode: "difference" } : undefined}
        initial={{ top: "-120px" }}
        animate={{ top: "0px" }}
        transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
      >
        {/* Wordmark — first in-flow item so justify-between pins it to the left
            gutter and spreads the nav items evenly across the rest. Click
            transitions home. */}
        <button
          type="button"
          onClick={() => runPageTransition(homePath)}
          aria-label="Brigada — home"
          className="flex items-center"
        >
          <BrigadaWordmark className="block h-auto w-[100px]" />
        </button>
        {/* Desktop nav items — collapsed into the hamburger below md.
            `md:contents` lets the children keep spreading via justify-between. */}
        <div className="hidden md:contents">
          {navItems.map((item, i) => (
            <NavItem
              key={item.label}
              item={item}
              openLabel={openLabel}
              openMenu={openMenu}
              scheduleClose={scheduleMenuClose}
              // Open dropdowns of items in the right half towards the right edge.
              alignRight={i >= Math.ceil(navItems.length / 2)}
              onNavigate={navigate}
              onPrefetch={prefetch}
              disabled={lockedDropdowns.includes(item.label)}
            />
          ))}
        </div>

        {/* Hamburger — only below md. */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Menu sluiten" : "Menu openen"}
          aria-expanded={mobileOpen}
          className="relative z-50 -mr-2 flex h-11 w-11 items-center justify-center self-center md:hidden"
        >
          <span className="relative block h-[14px] w-6">
            <span
              className="absolute left-0 block h-[1.5px] w-full bg-current transition-all duration-300"
              style={{
                top: mobileOpen ? "6px" : "0px",
                transform: mobileOpen ? "rotate(45deg)" : "none",
              }}
            />
            <span
              className="absolute left-0 bottom-0 block h-[1.5px] w-full bg-current transition-all duration-300"
              style={{
                bottom: mobileOpen ? "6px" : "0px",
                transform: mobileOpen ? "rotate(-45deg)" : "none",
              }}
            />
          </span>
        </button>
    </motion.nav>

      {/* Full-screen mobile menu overlay — sibling of the nav so `fixed`
          resolves against the viewport. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-0 z-[45] flex flex-col bg-brigada-black px-[clamp(24px,5vw,72px)] pt-[calc(88px+env(safe-area-inset-top,0px))] pb-[calc(48px+env(safe-area-inset-bottom,0px))] text-white md:hidden"
            style={{ fontFamily: SANS }}
          >
            <ul className="mt-6 flex flex-1 flex-col gap-7 overflow-y-auto">
              {navItems.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.08 + i * 0.05 }}
                >
                  <button
                    type="button"
                    onClick={() => navigate(item)}
                    className="text-[28px] uppercase leading-none tracking-[0.02em]"
                  >
                    {item.label}
                  </button>
                  {(item.submenu?.length ?? 0) > 0 && (
                    <ul className="mt-4 flex flex-col gap-3 pl-1">
                      {item.submenu!.map((sub) => (
                        <li key={sub.label}>
                          <button
                            type="button"
                            onClick={() => navigate(sub)}
                            className="text-[15px] uppercase tracking-[0.1em] text-white/60 transition-colors hover:text-white"
                          >
                            {sub.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SiteNav;
