"use client";

import { useEffect, useRef } from "react";

// Klavye kısayolları (SPEC 12): Space çevir, 1 Bilemedim, 2 Bildim, ←/→ önceki/sonraki, Enter, P telaffuz.

export type HotkeyBinding = {
  /** KeyboardEvent.key değeri: " ", "1", "ArrowLeft", "Enter", "p" … (harflerde büyük/küçük fark etmez) */
  key: string;
  handler: () => void;
  /** Odak bir butondayken de çalışsın mı? (Enter için false: butonun kendi tıklaması çalışsın) */
  inButtons?: boolean;
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

function isButtonTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.tagName === "BUTTON" || el.tagName === "A");
}

/** Yazı alanındayken kısayollar çalışmaz. Eşleşen tuşun varsayılan davranışı engellenir. */
export function useHotkeys(bindings: readonly HotkeyBinding[], enabled = true): void {
  const ref = useRef(bindings);
  useEffect(() => {
    ref.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if (isTypingTarget(e.target)) return;
      const binding = ref.current.find((b) => b.key.toLowerCase() === e.key.toLowerCase());
      if (!binding) return;
      if (binding.inButtons === false && isButtonTarget(e.target)) return;
      e.preventDefault();
      binding.handler();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
