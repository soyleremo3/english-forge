# EnglishForge

Tek kullanıcılı İngilizce çalışma uygulaması: 8'lik gruplarla kelime kartları, yazılı sınavlar, FSRS aralıklı tekrar, cümle kurma, kelime bankası, seri ve motivasyon. Sonraki aşamalarda yapay zekâ geri bildirimi, okuyucu, video kütüphanesi ve IELTS hazırlığı.

**Kuralların tek kaynağı `docs/SPEC.md`.** Her işe başlamadan önce ilgili bölümü oku. Bir kural değişecekse önce SPEC güncellenir, sonra kod.

## Yığın

Next.js (App Router) · TypeScript strict · Tailwind CSS v4 · Supabase (`@supabase/ssr`) · Vercel AI SDK (`ai`, `@ai-sdk/google`) · zod · ts-fsrs · Zustand · Vitest + Testing Library · Playwright. Paket yöneticisi: npm.

## Komutlar

```bash
npm run dev        # geliştirme sunucusu (http://localhost:3000)
npm run build      # üretim derlemesi
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # vitest run (birim testleri)
npm run test:e2e   # Playwright (uçtan uca)
```

## Klasör yapısı

```
docs/SPEC.md              ürün ve teknik şartname (tek kaynak)
src/app/                  rotalar (App Router), SPEC bölüm 12
src/components/           arayüz bileşenleri (nav/ = alt ve sol menü)
src/i18n/tr.ts            BÜTÜN arayüz metinleri
src/lib/                  iş mantığı (time.ts, ai.ts, fsrs, cevap kontrolü ...)
src/lib/prompts/          yapay zekâ sistem talimatları (Aşama 2)
src/test/                 test kurulumu
supabase/migrations/      SQL migration'lar
scripts/                  tek seferlik betikler (seed, enrich-words)
data/                     kelime verisi (CC BY-SA 4.0, data/LICENSE)
```

Testler test ettikleri dosyanın yanında durur: `foo.ts` → `foo.test.ts`.

## Kod kuralları

- TypeScript `strict`. `any` kullanılmaz (ESLint hata verir). Gerekirse `unknown` + zod ile daralt.
- Yapay zekâ kodu yalnızca sunucuda çalışır: ilgili dosyalar `import "server-only";` ile başlar. Yapay zekâ anahtarı asla `NEXT_PUBLIC_` önekli olmaz.
- Bütün arayüz metinleri `src/i18n/tr.ts` dosyasında. Bileşenlere doğrudan Türkçe/İngilizce arayüz metni yazılmaz.
- Tarih hesapları yalnızca `src/lib/time.ts` üzerinden (`getStudyDate`, İstanbul saati, 04:00 gün sınırı). Başka yerde `new Date()` ile gün hesabı yapılmaz.
- Önce mobil. Klavye erişimi, görünür odak ve `prefers-reduced-motion` desteği korunur.
- Renk anlamları: yeşil = bildim (`success`), kırmızı = bilemedim (`danger`), sarı = neredeyse (`warning`).

## Gizli anahtar kuralları

- Anahtarlar yalnızca `.env.local` dosyasında durur (yayında Vercel ortam değişkenlerinde). Değişken listesi `.env.example` dosyasında, değerleri boş.
- Anahtarlar asla ekrana yazdırılmaz, loglanmaz, commit edilmez. `.env.local` içeriği okunup çıktıya basılmaz.
- `SUPABASE_SERVICE_ROLE_KEY` ve `SUPABASE_DB_PASSWORD` yalnızca yerelde kullanılır; Vercel'e ve repoya konmaz.
- Her commit öncesi `git status` ile kontrol edilir: `.env*` dosyalarından yalnızca `.env.example` görünebilir.

## Çalışma kuralları

- İş bitti demeden önce `npm run lint`, `npm run typecheck` ve `npm test` çalıştırılır; hepsi geçmeli.
- SPEC'te olmayan bir karar gerekirse önce kullanıcıya sorulur, tahminle ilerlenmez.

## Rapor formatı

Her görevin sonu şu üç başlıkla biter:

1. **Ne yaptım** — kısa.
2. **Nasıl denersin** — adım adım.
3. **Senden istediklerim** — kullanıcının elle yapması gerekenler (giriş, onay, anahtar ekleme, deneme, karar). Numaralı, en önemlisi önce. Yoksa: "Şu an senden bir şey gerekmiyor".
