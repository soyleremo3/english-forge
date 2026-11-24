import type React from "react";
import { AppNav } from "@/components/nav/app-nav";

// Giriş gerektiren bütün sayfalar bu grupta. Erişim kontrolü src/proxy.ts'de.
export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <AppNav />
      <div className="md:pl-56">
        <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-10">
          {children}
        </main>
      </div>
    </>
  );
}
