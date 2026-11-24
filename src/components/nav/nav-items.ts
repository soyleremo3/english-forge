import { tr } from "@/i18n/tr";

export type NavIcon = "today" | "study" | "words" | "library" | "me";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
};

// docs/SPEC.md bölüm 12: Bugün · Çalış · Kelimeler · Kitaplık (A3) · Ben
export const navItems: readonly NavItem[] = [
  { href: "/", label: tr.nav.today, icon: "today" },
  { href: "/study", label: tr.nav.study, icon: "study" },
  { href: "/words", label: tr.nav.words, icon: "words" },
  { href: "/library", label: tr.nav.library, icon: "library" },
  { href: "/me", label: tr.nav.me, icon: "me" },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
