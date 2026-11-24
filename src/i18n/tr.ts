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
  auth: {
    title: "Giriş yap",
    subtitle: "E-posta adresine bir giriş bağlantısı gönderelim.",
    emailLabel: "E-posta",
    emailPlaceholder: "ornek@eposta.com",
    submit: "Giriş bağlantısı gönder",
    sending: "Gönderiliyor…",
    sent: "Bağlantı gönderildi. E-postanı kontrol et ve bağlantıyı bu cihazda, bu tarayıcıda aç.",
    rateLimited:
      "Çok fazla deneme yapıldı. Ücretsiz planda saatte en fazla 2 e-posta gidiyor. Gelen son e-postayı kullan ya da biraz sonra tekrar dene.",
    invalidEmail: "Geçerli bir e-posta adresi yaz.",
    private: "Bu uygulama özel. Bu e-posta ile giriş yapılamaz.",
    linkError: "Giriş bağlantısı geçersiz ya da süresi dolmuş. Yeni bir bağlantı iste.",
    profileError: "Profil oluşturulamadı. Biraz sonra tekrar dene.",
    sendError: "Bağlantı gönderilemedi. Biraz sonra tekrar dene.",
    signOut: "Çıkış yap",
  },
  placeholder: {
    comingSoon: "Bu sayfa yakında hazır olacak.",
    laterPhase: "Bu bölüm sonraki bir aşamada eklenecek.",
  },
} as const;
