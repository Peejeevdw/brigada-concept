"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { usePageTransition } from "@/components/PageTransition";
import { SANS, EASE_OUT } from "@/lib/siteTokens";
import { useSiteChrome } from "@/lib/site-chrome";

// Shared navigation for the new-style pages — the /concept nav (progressive
// blur backdrop + Expertise hover-dropdown), arranged as a left group · centred
// Brigada wordmark · right group. Extracted from the per-page copies in
// Brand/BrandV2/CareersV2/AboutV2/EmployerBranding so there's one source.
//
// The progressive-blur CSS lives globally in index.css.

type NavItemDef = { label: string; items: string[] };

const NAV_LEFT: NavItemDef[] = [
  { label: "Services", items: ["Brand", "Marketing", "People", "Product"] },
  { label: "Work", items: [] },
  { label: "About", items: [] },
];
const NAV_RIGHT: NavItemDef[] = [
  { label: "Careers", items: [] },
  { label: "Contact", items: [] },
];

// Where each label / sub-item navigates. Only the new-style destinations are
// wired; unknown labels are no-ops (placeholders) until their page exists.
const DEFAULT_NAV_TARGETS: Record<string, string> = {
  Services: "/services",
  Work: "/work",
  Brand: "/brand",
  Product: "/product",
  People: "/people",
  Marketing: "/marketing",
  About: "/about",
  Careers: "/careers",
  Contact: "/contact",
};

// One nav entry (label + optional hover dropdown).
const NavItem = ({
  item,
  openLabel,
  openMenu,
  scheduleClose,
  alignRight,
  onSub,
  onPrefetch,
}: {
  item: NavItemDef;
  openLabel: string | null;
  openMenu: (label: string) => void;
  scheduleClose: () => void;
  alignRight: boolean;
  onSub: (sub: string) => void;
  onPrefetch: (key: string) => void;
}) => (
  <div
    className="relative flex items-center px-5 -mx-5"
    onMouseEnter={() => {
      openMenu(item.label);
      onPrefetch(item.label);
    }}
    onMouseLeave={scheduleClose}
  >
    <span
      className="cursor-pointer text-[14px] uppercase tracking-[0.1em] opacity-90 transition-opacity hover:opacity-100"
      style={{ fontFamily: SANS }}
      onClick={() => onSub(item.label)}
    >
      {item.label}
    </span>
    <AnimatePresence>
      {openLabel === item.label && item.items.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          className={`absolute top-full pt-2 ${alignRight ? "right-5" : "left-5"}`}
        >
          <ul className="flex flex-row items-center gap-[clamp(32px,4vw,80px)] whitespace-nowrap">
            {item.items.map((sub) => (
              <li key={sub}>
                <button
                  type="button"
                  onClick={() => onSub(sub)}
                  onMouseEnter={() => onPrefetch(sub)}
                  className="block text-[14px] uppercase leading-[20px] tracking-[1.4px] opacity-90 transition-opacity hover:opacity-60"
                  style={{ fontFamily: SANS }}
                >
                  {sub}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// textClassName — tailwind colour for the nav (most pages: dark text on a light
// page; AboutV2 uses white). homePath — where the centred wordmark goes.
// navTargets — extend/override the default routing map.
const SiteNav = ({
  textClassName = "text-brigada-black",
  homePath = "/concept",
  navTargets,
}: {
  textClassName?: string;
  homePath?: string;
  navTargets?: Record<string, string>;
} = {}) => {
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const transitionTo = usePageTransition();
  const router = useRouter();

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

  // Pick URLs from the Sanity `main` menu when available. Falls back to the
  // hardcoded `DEFAULT_NAV_TARGETS` map for items the editor hasn't curated
  // yet (e.g. the Expertise submenu, which doesn't live in Sanity yet).
  const chrome = useSiteChrome();
  const sanityTargets = useMemo<Record<string, string>>(() => {
    const items = chrome?.mainMenu?.items ?? [];
    const map: Record<string, string> = {};
    for (const item of items) {
      if (item?.label && item?.url) map[item.label] = item.url;
    }
    return map;
  }, [chrome?.mainMenu?.items]);

  const targets = { ...DEFAULT_NAV_TARGETS, ...sanityTargets, ...navTargets };
  const onSub = (sub: string) => {
    const to = targets[sub];
    if (to) transitionTo(to);
    setMobileOpen(false);
  };
  // Warm the route (and its cached Sanity data) on hover, so the click commits
  // near-instantly and the crossfade gap stays tiny.
  const prefetch = (key: string) => {
    const to = targets[key];
    if (to) router.prefetch(to);
  };

  // Flat list for the mobile menu: top-level labels with their sub-items
  // expanded inline (no hover dropdowns on touch).
  const MOBILE_ITEMS = [...NAV_LEFT, ...NAV_RIGHT];

  const blurOpen = [...NAV_LEFT, ...NAV_RIGHT].some(
    (i) => i.label === openLabel && i.items.length > 0
  );

  return (
    <>
    <motion.div
      className="fixed inset-x-0 top-0 z-50"
      initial={{ y: "-100%" }}
      animate={{ y: "0%" }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.1 }}
    >
      <div className={`progressive-blur${blurOpen ? " is--open" : ""}`} aria-hidden>
        <div className="progressive-blur__layer is--1" />
        <div className="progressive-blur__layer is--2" />
        <div className="progressive-blur__layer is--3" />
        <div className="progressive-blur__layer is--4" />
        <div className="progressive-blur__layer is--5" />
      </div>
      <nav
        className={`relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)] ${textClassName} ${mobileOpen ? "max-md:!text-white" : ""}`}
      >
        {/* Wordmark — first in-flow item so justify-between pins it to the left
            gutter and spreads the nav items evenly across the rest. Click
            transitions home. */}
        <button
          type="button"
          onClick={() => transitionTo(homePath)}
          aria-label="Brigada — home"
          className="flex items-center"
        >
          <BrigadaWordmark className="block h-auto w-[100px]" />
        </button>
        {/* Desktop nav items — collapsed into the hamburger below md.
            `md:contents` lets the children keep spreading via justify-between. */}
        <div className="hidden md:contents">
          {NAV_LEFT.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              openLabel={openLabel}
              openMenu={openMenu}
              scheduleClose={scheduleMenuClose}
              alignRight={false}
              onSub={onSub}
              onPrefetch={prefetch}
            />
          ))}
          {NAV_RIGHT.map((item) => (
            <NavItem
              key={item.label}
              item={item}
              openLabel={openLabel}
              openMenu={openMenu}
              scheduleClose={scheduleMenuClose}
              alignRight
              onSub={onSub}
              onPrefetch={prefetch}
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
      </nav>
    </motion.div>

      {/* Full-screen mobile menu overlay — sibling of the (transformed) nav
          wrapper so `fixed` resolves against the viewport, not the wrapper. */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="fixed inset-0 z-40 flex flex-col bg-brigada-black px-[clamp(24px,5vw,72px)] pt-[88px] pb-12 text-white md:hidden"
            style={{ fontFamily: SANS }}
          >
            <ul className="mt-6 flex flex-1 flex-col gap-7 overflow-y-auto">
              {MOBILE_ITEMS.map((item, i) => (
                <motion.li
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.08 + i * 0.05 }}
                >
                  <button
                    type="button"
                    onClick={() => onSub(item.label)}
                    className="text-[28px] uppercase leading-none tracking-[0.02em]"
                  >
                    {item.label}
                  </button>
                  {item.items.length > 0 && (
                    <ul className="mt-4 flex flex-col gap-3 pl-1">
                      {item.items.map((sub) => (
                        <li key={sub}>
                          <button
                            type="button"
                            onClick={() => onSub(sub)}
                            className="text-[15px] uppercase tracking-[0.1em] text-white/60 transition-colors hover:text-white"
                          >
                            {sub}
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
