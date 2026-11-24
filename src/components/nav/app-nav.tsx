"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr } from "@/i18n/tr";
import { NavIcon } from "./nav-icon";
import { isActive, navItems } from "./nav-items";

// Mobilde altta sabit menü, masaüstünde (md ve üstü) solda dikey menü.
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label={tr.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:inset-y-0 md:right-auto md:w-56 md:border-t-0 md:border-r md:pb-0"
    >
      <p className="hidden px-6 pt-6 pb-4 text-lg font-semibold md:block">
        {tr.app.name}
      </p>
      <ul className="flex justify-around md:flex-col md:gap-1 md:px-3">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 px-2 py-2 text-xs font-medium md:flex-row md:gap-3 md:rounded-lg md:px-3 md:py-2.5 md:text-sm ${
                  active
                    ? "text-accent md:bg-accent-soft"
                    : "text-muted hover:text-foreground md:hover:bg-surface-hover"
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
