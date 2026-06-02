"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type AnchorProps = Omit<ComponentPropsWithoutRef<"a">, keyof LinkProps>;

interface NavLinkCompatProps extends AnchorProps, LinkProps {
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

/**
 * Drop-in replacement for react-router-dom's NavLink. Adds `activeClassName`
 * when the current pathname matches `href`. `end` (default false) requires an
 * exact match; otherwise a prefix match counts (so "/work/foo" highlights a
 * "/work" link).
 */
const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, end = false, href, ...props }, ref) => {
    const pathname = usePathname();
    const target = typeof href === "string" ? href : href.pathname ?? "";
    const isActive = end
      ? pathname === target
      : target === "/"
        ? pathname === "/"
        : pathname === target || pathname.startsWith(`${target}/`);

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
