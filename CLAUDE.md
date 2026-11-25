# EnglishForge

Tek kullanıcılı İngilizce çalışma uygulaması: 8'lik gruplarla kelime kartları, yazılı sınavlar, FSRS aralıklı tekrar, cümle kurma, kelime bankası, seri ve motivasyon. Sonraki aşamalarda yapay zekâ geri bildirimi, okuyucu, video kütüphanesi ve IELTS hazırlığı.

**Kuralların tek kaynağı `docs/SPEC.md`.** Her işe başlamadan önce ilgili bölümü oku. Bir kural değişecekse önce SPEC güncellenir, sonra kod.

## Yığın

Next.js (App Router) · TypeScript strict · Tailwind CSS v4 · Supabase (`@supabase/ssr`) · Vercel AI SDK (`ai`, `@ai-sdk/google`) · zod · ts-fsrs · Zustand · Vitest + Testing Library · Playwright. Paket yöneticisi: npm.

## Komutlar

```bash
npm run dev        # geliştirme sunucusu (http://localhost:3000)
npm run dev:lan    # aynı ağdaki telefondan erişim için (http://<bilgisayar IP>:3000)
npm run build      # üretim derlemesi
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
npm test           # vitest run (birim testleri)
npm run test:e2e   # Playwright (uçtan uca; masaüstü Chromium + iPhone Safari/WebKit; E2E_PASSWORD gerekir)
npm run users      # hesap oluştur / şifre belirle (şifre terminalde gizli girilir)
npm run db:types   # Supabase tiplerini yeniden üret (supabase login gerekir)
npm run db:push    # migration'ları uzak veritabanına uygula (supabase link gerekir)
npm run enrich -- --limit 50   # NGSL'yi Gemini ile zenginleştir → data/words.ngsl.json (kaldığı yerden devam eder)
npm run seed       # data/words.ngsl.json → words tablosu (service role, yalnızca yerel)
npm run words:report   # kalite özeti: işlev kelimeleri, alternatifler, kural uyarıları, --only komutu
npm run models     # Gemini model listesi
```

Kelime içerik kuralları SPEC 5.1'de. Alternatif yazım kuralının istisnaları `data/alternative-exceptions.json` dosyasında (`kind: "exclude" | "allow"`); koda gömülmez.

Betikler `tsx --conditions=react-server` ile çalışır; böylece `server-only` içeren modüller (`src/lib/ai.ts`) betiklerde de kullanılabilir.

## Supabase

- Proje: `english-forge`, ref `nqjbtiuygrxyvlmfrklt`, bölge eu-central-1.
- Şema yalnızca `supabase/migrations/` içindeki SQL dosyalarıyla değişir. Yeni migration dosya adı uzak veritabanındaki sürümle aynı olmalı (`supabase_migrations.schema_migrations`).
- Tipler: `src/lib/supabase/database.types.ts` (üretilmiş, elle düzenlenmez).
- Client'lar: `src/lib/supabase/client.ts` (tarayıcı), `server.ts` (sunucu), `proxy.ts` (oturum yenileme + giriş zorunluluğu, `src/proxy.ts` çağırır). Next.js 16'da middleware'in adı `proxy`.
- Giriş: e-posta + şifre (`src/app/login/actions.ts`). Kayıt yok, Supabase'de kayıt kapalı; hesaplar `npm run users` ile oluşturulur. Yedek: 6 haneli e-posta kodu (`EMAIL_CODE_LOGIN=true` + SMTP gerekir). `ALLOWED_EMAILS` kontrolü sunucuda: giriş action'ları ve proxy. Tek açık sayfa `/login`.
- Profil varsayılanları: `src/lib/settings.ts` (`DEFAULT_SETTINGS`).

## Klasör yapısı

```
docs/SPEC.md              ürün ve teknik şartname (tek kaynak)
src/app/(app)/            giriş gerektiren rotalar (menülü düzen), SPEC bölüm 12
src/app/login, auth/      giriş sayfası, callback ve çıkış
src/proxy.ts              oturum yenileme ve giriş zorunluluğu
src/components/           arayüz bileşenleri (nav/ = alt ve sol menü)
src/i18n/tr.ts            BÜTÜN arayüz metinleri
src/lib/                  iş mantığı (time.ts, ai.ts, fsrs, cevap kontrolü ...)
src/lib/study-days.ts     study_days okuma/yazma, Bugün durumu, görev güncelleme (server-only)
src/lib/today/tasks.ts    görev durumları, kilit, günün tamamlanma kuralı (saf, testli)
src/lib/streak.ts, xp.ts  seri ve XP/seviye hesapları (saf, testli)
src/lib/answer-check.ts   cevap kontrolü (SPEC 5.6, saf, testli)
src/lib/fsrs.ts           ts-fsrs sarmalayıcısı; ilk tekrar her zaman ertesi gün (testli)
src/lib/study/            grup çalışması durum makinesi, günün planı, sınav mantığı (saf, testli)
src/lib/new-words.ts      günün planı, "zaten biliyorum", grup sınavı kaydı (server-only)
src/stores/               Zustand + persist (localStorage) çalışma oturumları
src/components/study, quiz  kart, grup çalışması, sınav ekranları
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

## Test kullanıcısı ve geliştirici araçları

- Denemeler, ekran görüntülü kontroller ve veri yazan testler **yalnızca test kullanıcısıyla** yapılır: `ALLOWED_EMAILS` içindeki `+test` adresi (`npm run users` ile şifresi belirlenir). Gerçek kullanıcının verisine dokunulmaz; gerçek veri silinecekse önce kullanıcıya liste gösterilip onay alınır.
- Ben → "Geliştirici araçları" (yalnızca `next dev`): Bugünü sıfırla, Tarihi 1 gün ileri al, Gerçek tarihe dön. Tarih kaydırma `ef-dev-day-offset` çerezinde; uygulamanın "şimdi"si `requireUser().now` / `getNow()` (`src/lib/dev/clock.ts`) üzerinden alınır. Production'da panel çizilmez, action'lar 404 döner, çerez yok sayılır.

## Çalışma kuralları

- İş bitti demeden önce `npm run lint`, `npm run typecheck` ve `npm test` çalıştırılır; hepsi geçmeli.
- Her görevin sonunda değişiklikler **sormadan commit edilip push edilir** (kullanıcının kalıcı isteği). Öncesinde `git status` ile `.env*` (yalnızca `.env.example` hariç) ve gizli anahtar olmadığı kontrol edilir. Kullanıcının dışarıda tutulmasını istediği dosyalar (ör. enrich çalışırken `data/words.ngsl.json`) eklenmez. Raporda commit hash'i yazılır.
- Yönlendirmelerde `request.nextUrl.origin` yerine `requestOrigin()` (`src/lib/request-origin.ts`) kullanılır: `dev:lan` ile `0.0.0.0` üzerinde çalışırken doğru adrese dönülür.
- SPEC'te olmayan bir karar gerekirse önce kullanıcıya sorulur, tahminle ilerlenmez.

## Rapor formatı

Her görevin sonu şu üç başlıkla biter:

1. **Ne yaptım** — kısa.
2. **Nasıl denersin** — adım adım.
3. **Senden istediklerim** — kullanıcının elle yapması gerekenler (giriş, onay, anahtar ekleme, deneme, karar). Numaralı, en önemlisi önce. Yoksa: "Şu an senden bir şey gerekmiyor".
