"use client";

import { useCallback, useSyncExternalStore } from "react";

// Telaffuz: tarayıcının ücretsiz speechSynthesis özelliği (SPEC 5.1). Desteklenmiyorsa supported=false.

const subscribe = () => () => {};
const getSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;
const getServerSupported = () => false;

export function useSpeech(lang: string) {
  const supported = useSyncExternalStore(subscribe, getSupported, getServerSupported);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.95;
      const voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith("en"));
      if (voice) utterance.voice = voice;
      synth.speak(utterance);
    },
    [lang, supported],
  );

  return { supported, speak };
}
