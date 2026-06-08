"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  children?: { to: string; label: string }[];
}

const items: NavItem[] = [
  {
    to: "/services",
    label: "Services",
    children: [
      { to: "/brand", label: "Brand" },
      { to: "/marketing", label: "Marketing" },
      { to: "/people", label: "People" },
      { to: "/product", label: "Product" },
    ],
  },
  { to: "/work", label: "Work" },
  { to: "/about", label: "About" },
  { to: "/careers", label: "Careers" },
  { to: "/contact", label: "Contact" },
];

interface NavProps {
  variant?: "overlay" | "solid";
  showLogo?: boolean;
}

const isActivePath = (current: string, target: string, end = false) => {
  if (end || target === "/") return current === target;
  return current === target || current.startsWith(`${target}/`);
};

const Nav = ({ variant }: NavProps = {}) => {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname() ?? "/";
  if (pathname === "/animation") return null;
  const isHome = pathname === "/";
  const isWorkDetail = /^\/work\/[^/]+/.test(pathname);
  const isCareers = pathname === "/careers";
  const isFixedOverlay = isWorkDetail || isCareers;
  const isHomeFlowNav = false;
  const isTransparentOverlay = true;
  const navTextColor = "#ffffff";

  const homeBgRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const logoSpacerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const apply = () => {
      const footer = document.querySelector<HTMLElement>("[data-site-footer]");
      const header = headerRef.current;
      const homeBg = homeBgRef.current;
      const bg = bgRef.current;
      if (!header) return;
      const vh = window.innerHeight;
      let shiftPx = 0;
      if (footer) {
        const rect = footer.getBoundingClientRect();
        shiftPx = Math.max(0, vh - rect.top);
      }
      const ty = `translateY(${(-shiftPx).toFixed(2)}px)`;
      header.style.transform = ty;
      if (isHomeFlowNav && homeBg) homeBg.style.transform = ty;
      if (!isHomeFlowNav && bg) bg.style.transform = ty;
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
    };
  }, [isHomeFlowNav]);

  const open = (key: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenKey(key);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenKey(null), 120);
  };

  if (isHome && variant !== "solid") return null;

  return (
    <>
      {isHomeFlowNav && (
        <div
          ref={homeBgRef}
          aria-hidden
          className="sticky top-0 left-0 right-0 w-full pointer-events-none bg-[#f3f2ef]"
          style={{ height: "4.5rem", zIndex: 40, marginBottom: "-4.5rem", willChange: "transform" }}
        />
      )}
      {!isHomeFlowNav && (
        <div
          ref={bgRef}
          aria-hidden
          className="fixed top-0 left-0 right-0 w-full pointer-events-none bg-[#f3f2ef]"
          style={{ height: "4.5rem", zIndex: 40, willChange: "transform" }}
        />
      )}
      <header
        ref={headerRef}
        className={cn(
          "left-0 right-0 w-full pointer-events-none text-white",
          isHomeFlowNav
            ? "sticky top-0"
            : isFixedOverlay
              ? "fixed top-0"
              : "fixed top-0 z-50"
        )}
        style={isTransparentOverlay ? { zIndex: isFixedOverlay ? 60 : 70, mixBlendMode: "difference", willChange: "transform" } : { willChange: "transform" }}
      >
        <nav className="grid w-full grid-cols-6 items-center gap-3 md:gap-5 px-6 md:px-10 xl:px-24 2xl:px-48 min-[1800px]:px-72 min-[2400px]:px-96 h-[4.5rem] pointer-events-auto text-sm uppercase tracking-widest" style={{ fontFamily: "'Antarctica', system-ui, sans-serif" }}>
        <span ref={logoSpacerRef} className="relative inline-block" style={{ willChange: "opacity" }}>
          <span aria-hidden className="text-sm normal-case tracking-normal font-bold invisible" style={{ fontFamily: "'Brigada Serif', serif", fontWeight: 700 }}>
            Brigada
          </span>
          <Link
            ref={logoRef}
            href="/"
            className="absolute inset-0 flex items-center text-sm normal-case tracking-normal font-bold"
            style={{
              fontFamily: "'Brigada Serif', serif",
              fontWeight: 700,
              color: navTextColor,
              willChange: "opacity, transform",
              opacity: 1,
            }}
          >
            Brigada
          </Link>
        </span>
        {items.map((item) => {
          const hasChildren = !!item.children?.length;
          const isOpen = openKey === item.to;
          const isActive = isActivePath(pathname, item.to, item.to === "/");
          return (
            <div
              key={item.to}
              className="relative inline-flex"
              onMouseEnter={() => hasChildren && open(item.to)}
              onMouseLeave={() => hasChildren && scheduleClose()}
              onFocus={() => hasChildren && open(item.to)}
              onBlur={(e) => {
                if (
                  hasChildren &&
                  !e.currentTarget.contains(e.relatedTarget as Node)
                ) {
                  scheduleClose();
                }
              }}
            >
              <Link
                href={item.to}
                className={cn(
                  "group relative pb-1 inline-block transition-opacity",
                  isActive ? "opacity-100" : "opacity-90 hover:opacity-100"
                )}
              >
                {item.label}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute left-0 right-0 bottom-0 h-px transition-opacity duration-150",
                    isActive
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  )}
                  style={{ backgroundColor: navTextColor }}
                />
              </Link>

              {hasChildren && (
                <div
                  className={cn(
                    "absolute left-0 top-full pt-3 transition-opacity duration-150",
                    isOpen
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  )}
                  aria-hidden={!isOpen}
                >
                  <ul className="flex flex-col gap-1 py-2">
                    {item.children!.map((child, i) => (
                      <li
                        key={child.to}
                        className={isOpen ? "animate-fade-in" : "opacity-0"}
                        style={
                          isOpen
                            ? {
                                animationDelay: `${i * 60}ms`,
                                animationFillMode: "both",
                              }
                            : undefined
                        }
                      >
                        <Link
                          href={child.to}
                          className="inline-block whitespace-nowrap py-1 border-b border-transparent transition-colors hover:border-white/60"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        </nav>
      </header>
    </>
  );
};

export default Nav;
