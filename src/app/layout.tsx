import type { Metadata, Viewport } from "next";
import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNav } from "@/components/nav/app-nav";
import { tr } from "@/i18n/tr";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: tr.app.name,
  description: tr.app.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppNav />
        <div className="md:pl-56">
          <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-10 md:pt-10 md:pb-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
