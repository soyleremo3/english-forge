// Bütün arayüz metinleri burada durur (docs/SPEC.md bölüm 1, ilke 5).
// Bileşenlere metin yazma; buradan oku.

export const tr = {
  app: {
    name: "EnglishForge",
    description: "Tek kullanıcılı İngilizce çalışma uygulaması",
  },
  nav: {
    label: "Ana menü",
    today: "Bugün",
    study: "Çalış",
    words: "Kelimeler",
    library: "Kitaplık",
    me: "Ben",
  },
  today: {
    title: "Bugün",
    streak: "Seri",
    progress: "İlerleme",
    xp: "XP",
    level: "Seviye",
    tasksTitle: "Görevler",
    tasks: {
      review: "Tekrar",
      newWords: "Yeni kelimeler",
      dailyTest: "Günlük test",
      sentences: "Cümleler",
    },
    taskPending: "Bekliyor",
  },
  placeholder: {
    comingSoon: "Bu sayfa yakında hazır olacak.",
    laterPhase: "Bu bölüm sonraki bir aşamada eklenecek.",
  },
} as const;
