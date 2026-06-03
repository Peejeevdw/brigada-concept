import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import BrigadaWordmark from "@/components/BrigadaWordmark";
import { usePageTransition } from "@/components/PageTransition";
import { SANS, EASE_OUT } from "@/lib/siteTokens";

// Shared navigation for the new-style pages — the /concept nav (progressive
// blur backdrop + Expertise hover-dropdown), arranged as a left group · centred
// Brigada wordmark · right group. Extracted from the per-page copies in
// Brand/BrandV2/CareersV2/AboutV2/EmployerBranding so there's one source.
//
// The progressive-blur CSS lives globally in index.css.

type NavItemDef = { label: string; items: string[] };

const NAV_LEFT: NavItemDef[] = [
  { label: "Expertise", items: ["Brand", "Marketing", "People", "Product"] },
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
  Expertise: "/expertise",
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
}: {
  item: NavItemDef;
  openLabel: string | null;
  openMenu: (label: string) => void;
  scheduleClose: () => void;
  alignRight: boolean;
  onSub: (sub: string) => void;
}) => (
  <div
    className="relative flex items-center px-5 -mx-5"
    onMouseEnter={() => openMenu(item.label)}
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
  const transitionTo = usePageTransition();

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

  const targets = { ...DEFAULT_NAV_TARGETS, ...navTargets };
  const onSub = (sub: string) => {
    const to = targets[sub];
    if (to) transitionTo(to);
  };

  const blurOpen = [...NAV_LEFT, ...NAV_RIGHT].some(
    (i) => i.label === openLabel && i.items.length > 0
  );

  return (
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
        className={`relative z-50 flex h-[72px] items-stretch justify-between px-[clamp(24px,5vw,72px)] ${textClassName}`}
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
        {NAV_LEFT.map((item) => (
          <NavItem
            key={item.label}
            item={item}
            openLabel={openLabel}
            openMenu={openMenu}
            scheduleClose={scheduleMenuClose}
            alignRight={false}
            onSub={onSub}
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
          />
        ))}
      </nav>
    </motion.div>
  );
};

export default SiteNav;
