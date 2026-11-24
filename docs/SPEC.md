# EnglishForge: Ürün ve Teknik Şartname (v1)

> Çalışma adı "EnglishForge". İstersen değiştir.
> Bu dosya repoda `docs/SPEC.md` olarak durur. Claude Code her aşamada buna bakar. Bir kural değişecekse önce bu dosya güncellenir.

---

## 0. Özet

Tek kullanıcılı bir İngilizce çalışma uygulaması. Bütün çalışma tek arayüzden yürür: günlük kelime ezberi (8'lik gruplar, çevrilen kartlar, yazılı sınavlar), aralıklı tekrar, cümle kurma, kelime bankası, seri ve motivasyon. Sonraki aşamalarda yapay zekâ geri bildirimi, günlük yazma, kitap okuyucu, video kütüphanesi ve IELTS hazırlığı eklenir.

Hedef kullanıcı: Emrullah. Seviyesi B1'in biraz altı. Hedefi Nisan–Mayıs 2028'de IELTS Academic 6,5, Ekim 2028'e kadar 7.

**Aşamalar**

| Aşama | İçerik | Ne zaman |
|---|---|---|
| 1. Çekirdek | Kelime kartları, 8'lik gruplar, grup sınavı, günlük test, FSRS tekrar, cümle kaydı, kelime bankası, seri ve motivasyon, Bugün ekranı | İlk |
| 2. Yapay zekâ | Akıllı cevap kontrolü, cümle kontrolü, günlük yazma ve geri bildirimi, hata defteri | Aşama 1 en az 1 hafta kullanıldıktan sonra |
| 3. Okuma ve keşif | Kitaplık ve okuyucu (dokun-çevir), video ve konu kütüphanesi | Sonra |
| 4. IELTS ve konuşma | Writing Task 1/2, Speaking Part 1–3, 4/3/2 akıcılık egzersizi, deneme takibi | Sonra |

---

## 1. İlkeler

1. **Önce öğrenme, sonra oyunlaştırma.** Gün yalnızca gerçek görevler bitince tamamlanır. Ödüller gerçek çalışmaya bağlıdır.
2. **Yapay zekâ isteğe bağlı.** Yapay zekâ kapalıyken ya da kota bittiğinde çekirdek özellikler (kartlar, sınavlar, tekrar, seri) eksiksiz çalışır.
3. **Ücretsiz katmanlara sığar.** Gemini ücretsiz katmanı, Supabase Free ve Vercel Hobby (bkz. bölüm 3).
4. **Önce mobil.** Telefonda tek elle kullanılır, masaüstünde klavye kısayolları vardır.
5. **Türkçe arayüz, İngilizce içerik.** Bütün arayüz metinleri tek dosyada (`src/i18n/tr.ts`) durur. İleride İngilizce arayüz seçeneği eklenebilsin.
6. **Basit tut.** Her özellik önce en sade hâliyle yapılır.

---

## 2. Teknoloji

| Katman | Seçim | Not |
|---|---|---|
| Çatı | Next.js (App Router), TypeScript `strict`, Tailwind CSS v4 | Kalem projesiyle aynı yığın |
| Veritabanı, kimlik, dosya | Supabase (Postgres, Auth, Storage), `@supabase/ssr` | Free plan |
| Yapay zekâ | Vercel AI SDK (`ai`, `@ai-sdk/google`), `zod` ile yapılandırılmış çıktı | Kalem'deki `src/lib/ai.ts` model-fallback deseni |
| Aralıklı tekrar | `ts-fsrs` | FSRS algoritması |
| İstemci durumu | Zustand (+ `persist` ile localStorage) | Yarıda kalan çalışma oturumu kaybolmasın |
| Test | Vitest (birim), Playwright (birkaç temel uçtan uca akış) | |
| PWA | Web manifest + ikonlar | Telefonda ana ekrana eklenebilsin |
| Okuyucu (Aşama 3) | EPUB için `foliate-js` ya da `epubjs`, PDF için `pdfjs-dist` | |
| Yayın | Vercel Hobby, GitHub'da herkese açık repo | Kod lisansı MIT |

---

## 3. Ücretsiz katman kararları

### Supabase Free
- Sınırlar: Proje başına 500 MB veritabanı, 1 GB dosya alanı, en fazla 50 MB'lık dosya yüklenebiliyor, proje 1 hafta hareketsiz kalınca duraklatılıyor. Free planda otomatik yedek yok.
- Kelime verisi birkaç MB tutar, sorun olmaz.
- **Duraklamayı önleme:** Günlük kullanım zaten yeter. Ek güvence olarak Vercel Cron günde bir kez `/api/cron/keepalive` adresini çağırır. Bu adres `CRON_SECRET` ile korunur ve veritabanına tek bir hafif sorgu yapar.
- **Yedek:** Ayarlar → "Verilerimi indir" butonu bütün verileri JSON olarak indirir. Haftalık raporda yedek hatırlatması olur.
- **Kitaplar (Aşama 3):** Kitap başına en fazla 50 MB. Ayarlarda depolama göstergesi olur. Büyük dosyalar için "sadece bu cihazda sakla" (IndexedDB) seçeneği sunulur.

### Gemini API ücretsiz katmanı
- Sınırlar proje başına uygulanır ve AI Studio'da görünür. Günlük istek sayısı gece yarısı Pasifik saatinde sıfırlanır.
- **Model adları koda yazılmaz.** `GEMINI_MODELS` ortam değişkeninden okunur, örneğin `GEMINI_MODELS=<flash-lite-modeli>,<flash-modeli>`. Güncel adlar AI Studio'dan alınır. Önce Flash-Lite denenir, hata ya da kota durumunda sıradaki modele geçilir.
- **İstekleri azalt:**
  - Bir sınavdaki belirsiz cevapların hepsi sınav sonunda tek istekte kontrol edilir.
  - Cümleler tek istekte kontrol edilir.
  - Kelime çevirileri bir kez üretilir ve veritabanında saklanır.
  - Günlük bütçe `AI_DAILY_LIMIT` (varsayılan 150). Her çağrı `ai_usage` tablosuna yazılır. Bütçe dolunca yapay zekâ özellikleri "yarın tekrar dene" moduna geçer.
- **Gizlilik:** Ücretsiz katmanda gönderilen içerik Google ürünlerini geliştirmek için kullanılabiliyor. Günlük ve yazı ekranlarında "Kişisel bilgi yazma" uyarısı ve bir "Yapay zekâya gönderme" anahtarı olur.
- **Kullanım şartları:** Gemini API şartlarında yaş şartı var. Anahtarın kimin hesabından alınacağına aileyle birlikte karar verilir. Uygulama yapay zekâ olmadan da kullanılabilir şekilde tasarlanır.

### Erişim güvenliği
- Uygulama herkese açık bir adreste çalışır. Bu yüzden **yalnızca `ALLOWED_EMAILS` listesindeki e-postalar giriş yapabilir** (Supabase Auth, e-posta ile sihirli bağlantı). Başkaları API kotasını harcayamaz.
- Bütün tablolarda RLS (Row Level Security) açık: `user_id = auth.uid()`.

---

## 4. Gün yapısı ve Bugün ekranı

- **Saat dilimi:** `Europe/Istanbul`.
- **Gün sınırı:** Gün saat 04:00'te başlar, Anki'deki gibi. Gece 01:00'de çalışırsan önceki güne sayılır. `DAY_START_HOUR` ile ayarlanabilir. Bütün tarih hesapları tek bir yardımcı fonksiyondan geçer: `getStudyDate(now)`.
- **Bugün ekranı** (ana sayfa):
  - Üstte seri sayısı, günlük ilerleme halkası (tamamlanan / zorunlu görevler), XP ve seviye.
  - Altta görev listesi, önerilen sırayla. Kilitli değildir, yalnızca Günlük test yeni kelimeler bitince açılır:
    1. **Tekrar:** Vadesi gelen kartlar. Kart yoksa kendiliğinden tamamlanmış sayılır.
    2. **Yeni kelimeler:** N kelime, 8'lik gruplar halinde.
    3. **Günlük test:** Yazılı.
    4. **Cümleler:** En az 3 (ayarlanabilir).
    5. Sonraki aşamalarda açılanlar: Okuma (15 dk), Dinleme ve video, Günlük yazı, Konuşma, Hata tekrarı.
  - Ayarlar → "Zorunlu görevler": Günü tamamlamak için hangi görevlerin gerektiğini seçersin. Aşama 1'de varsayılan 1–4.
- **Gün tamamlanınca:** Kutlama ekranı (konfeti, kapatılabilir), "Gün tamamlandı", seri +1, günün özeti (kelime, doğruluk, süre, XP).

---

## 5. Kelime çalışması (Aşama 1, çekirdek)

### 5.1 Kelime kaynağı ve kart içeriği
- **Kaynak sırası:** NGSL 1.2 (2.809 kelime, sıklık sırasına göre) → NAWL (akademik) → kullanıcının eklediği kelimeler (kitaptan ya da elle).
- **Lisans:** NGSL ve NAWL, Creative Commons Attribution-ShareAlike 4.0 lisanslı. "Hakkında" sayfasında atıf yapılır. Repodaki türetilmiş veri dosyası (Türkçe anlamlarla birlikte) `data/` klasöründe aynı CC BY-SA 4.0 lisansıyla yayınlanır (`data/LICENSE`).
- **Kart alanları:**
  - `lemma`, kelime türü
  - Türkçe anlamlar (1–3)
  - Kabul edilen İngilizce alternatifler (eş anlamlılar, farklı yazımlar)
  - Kısa İngilizce tanım
  - İngilizce örnek cümle ve Türkçesi
  - Tahmini CEFR seviyesi
- **Zenginleştirme:** Tek seferlik çalıştırılan `scripts/enrich-words.ts` betiği Gemini ile 25'erli partiler halinde Türkçe anlam, alternatif, tanım ve örnek üretir.
  - Sonucu `data/words.ngsl.json` dosyasına yazar.
  - Kaldığı yerden devam edebilir. Kota dolarsa ertesi gün sürer.
  - Seed betiği bu JSON'u veritabanına yükler.
  - Anlamı boş kalan kelimeler yeni kelime kuyruğuna alınmaz.
  - Kullanıcı her anlamı kelime bankasından düzenleyebilir.
- **Telaffuz:** Tarayıcının ücretsiz `speechSynthesis` özelliği kullanılır. Ayarlarda en-US / en-GB seçimi olur.

### 5.2 Seviye tespiti (ilk açılış)
- "Bildiklerini işaretle" ekranı NGSL'nin ilk yaklaşık 1.000 kelimesini 50'li sayfalarda gösterir. Her kelimede "Biliyorum / Bilmiyorum" seçilir.
- "Biliyorum" denen kelime `known` durumuna geçer ve yeni kelime kuyruğuna girmez. Böylece "the, have" gibi kelimelerle zaman kaybedilmez.
- Yeni kelime tanıtılırken her kartta küçük bir "Bunu zaten biliyorum" bağlantısı da olur.

### 5.3 Grup çalışması (kullanıcının tarif ettiği akış)
- Günün yeni kelimeleri kuyruktaki sıradaki N kelimedir. 8'lik gruplara bölünür, son grup daha küçük olabilir.
- **Kart:**
  - Ön yüz: Türkçe anlam ve kelime türü.
  - Dokununca ya da Space tuşuyla döner.
  - Arka yüz: İngilizce kelime, telaffuz butonu, örnek cümle.
- Arka yüz görünce iki buton çıkar: **Bilemedim** (kısayol 1) ve **Bildim** (kısayol 2).
- **Tur mantığı:**
  - Bir tur, gruptaki aktif kelimelerin sırayla gösterilmesidir.
  - Son kelimeden sonra başa dönülür (döngü).
  - "Bildim" denen kelime aktif listeden çıkar, sonraki turda gelmez.
  - "Bilemedim" denen kelime listede kalır.
  - Her yeni turda sıra karıştırılır, böylece sıra ezberlenmez. Ayarlardan kapatılabilir.
  - Kullanıcı istediği an okla ileri ya da geri gidebilir. Döngü sonsuzdur.
- **Aktif kelime kalmayınca** "Bu grubu bir daha çalışmak ister misin?" sorusu çıkar:
  - **Evet:** Gruptaki 8 kelimenin hepsi yeniden aktif olur, yeni tur başlar.
  - **Hayır:** Grup sınavına geçilir.
- **Grup sınavı** (kart çevirme yok, cevap yazılır):
  - Gruptaki her kelime bir kez sorulur.
  - Yön ayarı: Varsayılan **Karışık** (yarısı Türkçe → İngilizce yazılır, yarısı İngilizce → Türkçe). Ayarlardan yalnızca TR→EN ya da yalnızca EN→TR seçilebilir.
  - Cevaplar bölüm 5.6'ya göre kontrol edilir. Her cevaptan hemen sonra geri bildirim gösterilir (doğru / neredeyse / yanlış, yanlışsa doğrusu). Enter ile sonraki soruya geçilir.
  - Sonuç ekranında puan ve yanlışlar listesi olur. İsteğe bağlı "Yanlışları tekrar çalış" seçeneği yalnızca yanlış kelimelerle kısa bir kart döngüsü ve mini sınav açar.
  - Sınav bitince grubun her kelimesi FSRS kartına dönüşür. İlk sınavda doğru bilinen kelime `Good`, yanlış bilinen `Again` olarak işlenir, yani yarın tekrar karşına çıkar.
  - Sonra bir sonraki grup açılır.
- Oturum durumu Zustand ve localStorage'da tutulur. Sayfa yenilense ya da telefon kapansa kaldığın yerden devam edersin.

### 5.4 Günlük test
- Bütün gruplar bitince açılır.
- **İçerik:**
  - Bugünün bütün yeni kelimeleri
  - Son 7 günde hata yapılan kelimelerden en fazla 8 tanesi
  - Sıra karışık, cevaplar yazılı, yön karışık.
- Sonuç yüzde olarak kaydedilir. Yanlış yapılan kelimeler FSRS'te `Again` olarak işlenir.
- Görevin tamamlanması için testi bitirmek yeter, puan şartı yoktur. Puan, haftalık ayarlamada kullanılır (5.9).

### 5.5 Tekrar (FSRS ile aralıklı tekrar)
- Her gün vadesi gelen kartlar gösterilir.
- Kart Türkçe yüzle başlar, çevrilince İngilizcesi görünür. Butonlar: **Bilemedim** = `Again`, **Bildim** = `Good`. Ayarlardan dörtlü düzene (Again / Hard / Good / Easy) geçilebilir.
- Her 5 tekrar kartından biri yazılı sorulur, böylece aktif hatırlama yapılır. Ayarlardan değiştirilebilir.
- Hedef hatırlama oranı (desired retention) 0,90. Ayarlardan değiştirilebilir.
- Günlük tekrar üst sınırı 150 (ayarlanabilir). Fazlası ertesi güne kayar ve uyarı gösterilir.

### 5.6 Cevap kontrol kuralları
1. **Normalizasyon:**
   - Küçük harfe çevrilir. Türkçe için `toLocaleLowerCase('tr')` kullanılır (I/ı ve İ/i sorunu olmasın).
   - Baştaki ve sondaki boşluklar, noktalama ve fazla boşluklar temizlenir.
   - İngilizcede baştaki `to ` (fiiller) ve `a / an / the` yok sayılır.
   - Türkçede baştaki "bir" ve parantez içindeki açıklamalar yok sayılır.
2. **Doğru:** Kabul edilen cevaplardan biriyle birebir eşleşme.
3. **Neredeyse:** 5 ve daha uzun harfli kelimelerde Damerau-Levenshtein mesafesi 1 ise doğru sayılır ama yazım uyarısı gösterilir. 4 harf ve daha kısa kelimelerde tam eşleşme gerekir.
4. **Belirsiz:** Eşleşme yoksa ve yapay zekâ açıksa, sınav sonunda bütün belirsiz cevaplar **tek istekle** sorulur: "Bu cevap bu kelimenin geçerli bir anlamı mı?" Cevap doğru/yanlış ve kısa bir açıklamadır. Yapay zekânın kabul ettiği cevap o kelimenin kabul listesine eklenir, bir daha sorulmaz.
5. **Yapay zekâ kapalıyken:** Eşleşmeyen cevap yanlış sayılır. Ama "Aslında doğruydu" itiraz butonu olur. İtiraz edilen cevap kabul listesine eklenir ve sonuç düzeltilir.

### 5.7 Cümle kurma
- Bugünün kelimelerinden en az 3 tanesiyle cümle kurulur (ayar: 3–8). Kelime seçicide sınavda yanlış yapılan kelimeler önce önerilir.
- Bütün cümleler kaydedilir. Aşama 1'de yapay zekâ kontrolü yoktur. Kendin kontrol etmen için kelimenin örnek cümlesi yanında gösterilir.
- Aşama 2'de bütün cümleler tek istekte kontrol edilir (bkz. 7.2).
- Zorunlu sayıdan fazla kurulan cümle ek XP verir.

### 5.8 Kelime bankası
- Bütün kelimeler liste ya da kart görünümünde.
  - **Arama:** Türkçe ya da İngilizce.
  - **Filtre:** Durum (yeni / öğreniliyor / tekrarda / oturmuş / zaten biliyordum / askıya alındı), kaynak, CEFR, eklenme tarihi.
  - **Sıralama:** Alfabetik, tarih, zorluk.
- **Kelime detayı:**
  - Anlamlar (düzenlenebilir) ve örnekler
  - Senin kurduğun cümleler
  - Geçmiş: her tekrar ve sınav cevabı
  - Sonraki tekrar tarihi ve tahmini hatırlama olasılığı
- **Eylemler:** Anlamı düzenle, alternatif ekle, askıya al, sıfırla, elle kelime ekle. Yapay zekâ açıksa anlamlar otomatik doldurulur.
- **Dışa aktarma:** CSV ve Anki uyumlu TSV.

### 5.9 Uyarlamalı günlük kelime sayısı
- Başlangıç: Günde 8 kelime (1 grup).
- Her Pazar son 7 gün değerlendirilir:
  - **Artır (+4, en fazla 24):** En az 6 gün tamamlanmışsa, günlük test ortalaması en az %85'se, tekrar doğruluğu en az %85'se ve günlük ortalama tekrar sayısı 80'in altındaysa.
  - **Azalt (−4, en az 4):** Günlük test ortalaması %70'in altındaysa, tekrar doğruluğu %75'in altındaysa, günlük ortalama tekrar 120'nin üstündeyse ya da 3 veya daha fazla gün kaçırılmışsa.
  - Aksi halde sayı değişmez.
- Karar otomatik uygulanmaz. Pazartesi Bugün ekranında gerekçesiyle birlikte bir öneri kartı çıkar: "Uygula / Şimdilik kalsın". Ayarlardan elle de değiştirilebilir.
- Grup boyu varsayılan 8. Ayarlardan 6–10 arasında değiştirilebilir. 8'e bölünmeyen sayılarda son grup küçük olur, örneğin 12 kelime = 8 + 4.

---

## 6. Motivasyon sistemi (Aşama 1)

> Araştırma notu: Duolingo verisine göre 7 günlük seriye ulaşan öğrencilerin ertesi gün devam etme olasılığı 2,4 kat daha yüksek. Seri dondurma hakkı, seri bozulduğunda bırakmayı azaltıyor. Ama motivasyonu yalnızca oyunlaştırmaya dayanan öğrencilerin bırakma oranı daha yüksek. Bu yüzden her ödül gerçek çalışmaya bağlıdır.

- **Seri:** Günün tamamlandığı ardışık gün sayısı.
- **Seri dondurma:** Her 7 günlük seride 1 hak kazanılır, en fazla 2 hak birikir. Bir gün kaçırılırsa hak otomatik kullanılır. O gün "donmuş" görünür, seri bozulmaz ama artmaz.
- **XP:**

  | Eylem | XP |
  |---|---|
  | Yeni kelime öğrenme (grup sınavı sonunda) | 10 |
  | Tekrar kartı | 2 |
  | Sınavda doğru cevap | 3 |
  | Cümle (Aşama 2'de yapay zekâ doğru bulursa +5) | 15 |
  | Günlük testten tam puan | +50 |
  | Günü tamamlama | +50 |
  | Sonraki aşamalar: Günlük yazı 30, okumada dakika başı 1, video 20, konuşma 30 | |

- **Seviye:** XP eşikleri, seviye n için yaklaşık `100 · n^1.5` toplam XP.
- **Aktivite takvimi:** GitHub tarzı ısı haritası, son 12 ay. Renk koyuluğu o günün XP'sini gösterir. Donmuş günler farklı renkte.
- **Rozetler:**
  - Seri: İlk gün, 7 / 30 / 100 / 365 gün
  - Kelime: 100 / 500 / 1.000 / 2.809 kelime; NGSL'nin %25 / 50 / 75 / 100'ü
  - Diğer: İlk tam puanlı günlük test, 50 cümle
  - Sonraki aşamalar: İlk kitap, ilk IELTS denemesi
- **Haftalık rapor (Pazar):**
  - Öğrenilen kelime sayısı, hatırlama oranı, toplam süre, en zor 5 kelime
  - Uyarlamalı kelime sayısı önerisi (5.9)
  - Veri yedeği hatırlatması
  - Yapay zekâ açıksa 3 cümlelik kişisel yorum
- **Hedef göstergeleri:** Mevcut hızla tahmini NGSL bitiş tarihi. IELTS sınavına kalan gün sayacı (hedef tarih ayarlanabilir, varsayılan 2028-04-15).
- **Ton:** Suçlayıcı mesaj yok. Seri bozulunca "Yeniden başlamak en önemli adım" gibi bir mesaj gösterilir. Tek kullanıcılı uygulama olduğu için liderlik tablosu yok.

---

## 7. Aşama 2: Yapay zekâ özellikleri

### 7.1 Yapay zekâ katmanı (`src/lib/ai.ts`)
- `server-only`: Anahtar ve çağrılar yalnızca sunucuda çalışır.
- `GEMINI_MODELS` listesindeki modeller sırayla denenir. Hata, zaman aşımı (20 sn) ya da kota dolması durumunda sıradakine geçilir.
- Çıktılar zod şemalarıyla doğrulanır (`generateObject` / `Output.object`).
- Her çağrı `ai_usage` tablosuna yazılır (tarih, özellik, model, başarılı mı) ve günlük bütçe kontrol edilir.
- Bütün sistem talimatları `src/lib/prompts/` altında durur. Geri bildirim dili Türkçe, düzeltmeler İngilizcedir. Seviye ayarlardaki CEFR'e göre ayarlanır.
- Kullanıcı 18 yaşından küçük olabilir. İçerik yaşa uygun olur, uygunsuz istekler reddedilir.

### 7.2 Akıllı cevap kontrolü ve cümle kontrolü
- 5.6'daki "belirsiz" adımı ve 5.7'deki cümle kontrolü bu aşamada yapay zekâya bağlanır.
- **Cümle geri bildirimi:**
  - Kelime doğru anlamda kullanılmış mı?
  - Dilbilgisi hataları
  - Cümle doğal mı?
  - Düzeltilmiş hali ve kısa Türkçe açıklama
  - 1–5 arası puan
  - Bulunan hatalar hata defterine yazılır.

### 7.3 Günlük ve serbest yazı
- **Editör:** Tarih, başlık, metin ve kelime sayacı. "Konu öner" butonu yapay zekâdan ya da 100 konuluk hazır listeden konu getirir.
- "Yapay zekâya gönder" anahtarı. Varsayılan açık, yanında kişisel bilgi uyarısı olur.
- **Geri bildirim:**
  - Düzeltilmiş metin, fark görünümüyle: Silinenler kırmızı, eklenenler yeşil.
  - En önemli 3–5 hata ve Türkçe açıklamaları
  - Daha iyi kelime önerileri, mümkünse öğrendiğin kelimelerden
  - Metin 150 kelimeyi geçiyorsa IELTS'in dört yazma kriterine göre **tahmini** band. "Resmi değildir" etiketiyle gösterilir. Kriterler: Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.
  - Hatalar hata defterine yazılır.

### 7.4 Hata defteri
- **Kaynaklar:** Cümleler, günlük, IELTS yazma, konuşma.
- **Alanlar:** Orijinal, düzeltilmiş, kategori, Türkçe kural, görülme sayısı. Kategoriler: article, tense, preposition, word choice, word order, spelling, agreement, other.
- **"Hatalarımdan çalış":** En sık hata kategorilerinden 8 soruluk bir boşluk doldurma ya da düzeltme alıştırması üretilir. Yapay zekâ kapalıysa kendi hatalı cümlelerini düzeltip yeniden yazarsın.
- Bugün ekranında haftada 2 kez isteğe bağlı "Hata tekrarı" görevi çıkar.

---

## 8. Aşama 3: Okuma ve keşif

### 8.1 Kitaplık ve okuyucu
- **Kitap ekleme:**
  - (a) Kendi EPUB ya da PDF dosyan. Supabase Storage'a yüklenir, en fazla 50 MB. Telifli içerik yalnızca kişisel kullanım için yüklenir.
  - (b) Telifsiz kitap: Project Gutenberg ID'siyle içe aktarma. Sunucu kitabı tek seferde indirir. Standard Ebooks dosyaları da yüklenebilir.
- **Kitap önerileri:** Seviyeye göre telifsiz kısa öyküler ve klasikler. Her kitapta tahmini zorluk gösterilir: Kitabın kelimelerinin yüzde kaçını bildiğin. %95 ve üstü önerilir.
- **Okuyucu:**
  - Kaldığın yer kaydedilir. Yazı boyutu ayarlanır, koyu tema vardır.
  - **Kelimeye dokununca** bir pencere açılır: Anlam (önce kendi kelime bankandan, yoksa yapay zekâdan; sonuç önbelleğe alınır), telaffuz ve "Desteme ekle" butonu. Eklenen kelimenin örnek cümlesi kitaptaki cümle olur, kaynağı "kitap" olarak kaydedilir.
- **Okuma süresi:** Sekme açıkken ve son 60 saniyede etkileşim varken sayılır. "Okuma 15 dk" görevini doldurur.
- **Bölüm sonu:** İsteğe bağlı "2–3 cümleyle özetle". Yapay zekâ kontrol eder.

### 8.2 Video ve konu kütüphanesi
- **Hazır liste** (`data/videos.json`): BBC Learning English 6 Minute English, TED-Ed, Harvard CS50, 3Blue1Brown, Kurzgesagt gibi kanal ve oynatma listesi bağlantıları. Her biri seviyeyle etiketlenir.
- Kullanıcı kendi bağlantısını ekleyebilir. Videolar gömülü YouTube oynatıcıda izlenir.
- **İzledikten sonra:** "Ne öğrendin? 2–3 cümle yaz" ve yeni kelimeleri desteye ekleme. Bu, "Dinleme" görevini tamamlar.
- **Yapay zekâ önerileri:** Hata defterine ve zayıf becerilere göre "Bu hafta çalışman gereken 3 konu". Her konu için yalnızca bir YouTube **arama** bağlantısı üretilir (`https://www.youtube.com/results?search_query=...`). **Yapay zekâ video adresi uydurmaz.**

---

## 9. Aşama 4: IELTS ve konuşma

- **Sınav sayacı ve hedef band.**
- **Writing:**
  - Task 1: Yapay zekâ bir veri tablosu üretir, uygulama bunu SVG grafik olarak çizer.
  - Task 2: Konu bankası ve yapay zekânın ürettiği konular.
  - Zamanlayıcı (20 ve 40 dk) ve kelime sayacı.
  - Geri bildirim dört kriterle ve **tahmini** bandla verilir. Metnin tamamı yeniden yazılmaz, sadece bir paragrafın nasıl geliştirileceği gösterilir.
- **Speaking:**
  - Part 1: Kısa sorular.
  - Part 2: Konu kartı, 1 dk hazırlık, 2 dk konuşma.
  - Part 3: Tartışma soruları.
  - Ses mikrofondan kaydedilir (MediaRecorder).
  - Değerlendirme: Ses dosyası Gemini'ye gönderilir. Dönen transkript ve dört kritere göre **tahmini** geri bildirim gösterilir: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Kota yoksa tarayıcının konuşma tanımasıyla (Web Speech API) yalnızca transkript çıkarılır.
- **4/3/2 akıcılık egzersizi:** Aynı konu üç kez anlatılır: 4, 3 ve 2 dakikada. Zamanlayıcı ve kayıt vardır. Dakika başına kelime sayısı karşılaştırılır.
- **Reading ve Listening:** Yapay zekâ akademik bir metin ve IELTS soru tipleri üretir: True/False/Not Given, başlık eşleştirme, boşluk doldurma. "Alıştırmadır, gerçek sınav değildir" etiketi taşır. Resmi ücretsiz denemeler için British Council IELTS Ready bağlantısı verilir.
- **Deneme sonuçları:** Zaman içindeki gelişim grafiği.

---

## 10. Uygulama içi "Yöntemler" sayfası

Statik bir Markdown sayfası. Kısa, uygulanabilir kurallar:

**Kelime**
- Önce en sık kullanılan 3.000 kelime (NGSL), sonra akademik kelimeler (NAWL). Yazılı bir metnin %98'ini rahat anlamak için 8.000–9.000 kelime ailesi gerekiyor. Konuşulan metin için 6.000–7.000 yeterli.
- Kelimeyi tek başına değil, cümle içinde öğren. Hep örnek cümleyle çalış.
- Aralıklı tekrar, aynı gün defalarca tekrar etmekten daha kalıcı. Tekrarları atlama, yeni kelimeyi azalt.
- Tanımaktan çok hatırlamaya çalış. Yazılı sınavlar bu yüzden var.

**Dinleme ve okuma**
- Bol ve kolay girdi: Metnin büyük kısmını anlıyorsan bilmediğin kelimeleri bağlamdan öğrenirsin.
- Gölgeleme: Konuşmacıyı 1 saniye geriden sesli takip et. Özellikle dinlemeyi geliştirir.

**Konuşma**
- 4/3/2 tekniği: Aynı konuyu üç kez anlat, 4, 3 ve 2 dakikada. Araştırmalarda konuşma hızını artırdığı ve duraksamaları azalttığı görülmüş.
- Hata korkusuyla susma. Akıcılık önce gelir, doğruluk geri bildirimle düzelir.
- Projelerini, basketbolu ve robotiği İngilizce anlatan hazır anlatımlar oluştur.

**Yazma**
- Yaz → geri bildirim al → yeniden yaz. Asıl öğrenme yeniden yazarken olur.
- Kendi hata defterinden çalış. Aynı 5 hata çoğu zaman bütün puanı düşürür.

**IELTS taktikleri**
- Kriterleri ezberle. Writing'de 4 kriter var: Task Response (Task 1'de Task Achievement), Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Speaking'de de 4: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Her geri bildirimi bu kriterlere göre oku.
- Writing Task 2, Task 1'den daha çok puan getirir. Sürenin 40 dakikasını Task 2'ye ayır.
- Speaking Part 1'de her cevabı 2–3 cümleye genişlet. Ezber cevap verme, sınav görevlileri bunu fark eder ve puan kırar.
- Reading'de "False" ile "Not Given" farkını iyi öğren. Her metne yaklaşık 20 dakika ayır.
- Listening'de sorulara önceden göz at. Yazım hataları cevabı yanlış yapar.

---

## 11. Veri modeli (Supabase / Postgres)

Bütün tablolarda `user_id uuid references auth.users` ve RLS açık. Yalnızca `words` paylaşılan kataloğu kullanıcıya bağlı değildir: Herkes okuyabilir, yalnızca service role yazabilir.

| Tablo | Önemli kolonlar |
|---|---|
| `profiles` | `user_id` (PK), `settings jsonb`: `daily_new` (8), `group_size` (8), `quiz_direction` (mixed), `required_tasks`, `min_sentences` (3), `desired_retention` (0.9), `review_cap` (150), `tts_accent`, `ai_enabled`, `journal_ai`, `ielts_target_date`, `cefr`; `freezes_available`, `created_at` |
| `words` | `id`, `lemma`, `pos`, `tr_meanings text[]`, `en_alternatives text[]`, `en_definition`, `example_en`, `example_tr`, `source` (ngsl/nawl/book/manual), `rank`, `cefr`, `created_by` (manual ise kullanıcı) |
| `user_words` | `id`, `user_id`, `word_id`, `status` (new/learning/review/known/suspended), FSRS alanları (`due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `state`, `last_review`), `introduced_on date`, `custom_tr text[]`, `accepted_answers text[]`, `notes` |
| `review_logs` | `id`, `user_id`, `user_word_id`, `kind` (learn/review/group_quiz/daily_test/typed_review), `rating`, `direction`, `answer`, `result` (correct/almost/wrong), `ai_checked bool`, `created_at` |
| `study_days` | `user_id`, `study_date` (PK birlikte), `tasks jsonb` (her görevin durumu ve sayıları), `daily_test_score`, `xp`, `completed_at`, `frozen bool`, `minutes` |
| `quiz_attempts` | `id`, `user_id`, `kind` (group/daily/error_review), `study_date`, `items jsonb`, `score`, `created_at` |
| `sentences` | `id`, `user_id`, `word_id`, `text`, `ai_feedback jsonb`, `corrected`, `ok bool`, `created_at` |
| `badges` | `user_id`, `badge_key`, `earned_at` |
| `ai_usage` | `id`, `user_id`, `day`, `feature`, `model`, `ok bool`, `created_at` |
| `error_log` (A2) | `id`, `user_id`, `source`, `original`, `corrected`, `category`, `rule_tr`, `times_seen`, `last_seen` |
| `journal_entries` (A2) | `id`, `user_id`, `entry_date`, `title`, `body`, `word_count`, `sent_to_ai`, `ai_feedback jsonb` |
| `books` (A3) | `id`, `user_id`, `title`, `author`, `format`, `storage_path`, `local_only bool`, `source`, `progress jsonb`, `minutes_read`, `coverage` |
| `reading_sessions` (A3) | `id`, `user_id`, `book_id`, `study_date`, `minutes` |
| `videos` (A3) | `id`, `user_id`, `title`, `url`, `level`, `tags`, `watched_at`, `summary` |
| `ielts_attempts` (A4) | `id`, `user_id`, `kind` (writing1/writing2/speaking1/2/3/reading/listening), `prompt`, `response`, `audio_path`, `feedback jsonb`, `band_estimate`, `created_at` |

Şema değişiklikleri `supabase/migrations/` altında SQL migration olarak tutulur.

---

## 12. Ekranlar ve gezinme

- **Mobil alt menü:** Bugün · Çalış · Kelimeler · Kitaplık (A3) · Ben. Masaüstünde aynı menü solda durur.
- **Rotalar:**
  - `/` Bugün
  - `/study/review` Tekrar
  - `/study/new` Grup çalışması
  - `/study/quiz/[id]` Sınav
  - `/study/daily-test` Günlük test
  - `/sentences` Cümleler
  - `/words` Kelime bankası, `/words/[id]` kelime detayı
  - `/placement` Seviye tespiti
  - `/me` İstatistik, takvim, rozetler, `/me/settings` Ayarlar
  - `/methods` Yöntemler
  - `/about` Lisans ve atıflar
  - Sonraki aşamalar: `/journal`, `/errors`, `/library`, `/read/[id]`, `/videos`, `/ielts/*`
- **Klavye kısayolları:**
  - Space: kartı çevir
  - 1: Bilemedim, 2: Bildim
  - ← / →: önceki / sonraki kart
  - Enter: cevabı gönder / sonraki soru
  - P: telaffuzu dinle
- **Tasarım:**
  - Sade ve odaklı, büyük kartlar, akıcı çevirme animasyonu.
  - Renk anlamları net: Yeşil = bildim, kırmızı = bilemedim, sarı = neredeyse.
  - Koyu mod ve Türkçe karakter desteği.
  - İlham kaynakları: Kalem projesi, Anki (sadelik), Duolingo (anında geri bildirim, kutlama), LingQ / Readlang (okuyucuda dokun-çevir). Hiçbir ürünün markası, logosu ya da maskotu kopyalanmaz.

---

## 13. Kalite ve güvenlik

- **Birim testleri (Vitest):**
  - Cevap kontrolü ve Türkçe/İngilizce normalizasyon
  - Damerau-Levenshtein
  - Grup döngüsü ve tur mantığı
  - FSRS sarmalayıcısı
  - `getStudyDate` (04:00 sınırı, İstanbul saati)
  - Seri ve dondurma hakkı
  - XP ve seviye hesapları
  - Uyarlamalı kelime sayısı kararı
- **Uçtan uca testler (Playwright):** Giriş, bir grubu çalışıp sınavı bitirme, günlük test, günü tamamlama.
- **Gizli anahtarlar:**
  - Yalnızca `.env.local` ve Vercel ortam değişkenlerinde durur. `.env*` dosyaları `.gitignore`'da.
  - Yapay zekâ anahtarı **asla** `NEXT_PUBLIC_` önekiyle tanımlanmaz.
  - `SUPABASE_SERVICE_ROLE_KEY` yalnızca yerelde, seed ve zenginleştirme betiklerinde kullanılır.
- **Yapay zekâ rotaları:** Oturum kontrolü, girdi uzunluğu sınırı, zod doğrulaması, günlük bütçe kontrolü.
- **Erişilebilirlik:** Her şey klavyeyle kullanılabilir, odak görünür, kontrast yeterli, `prefers-reduced-motion` desteklenir.
- **README (İngilizce, portföy için):** Ekran görüntüleri, mimari şeması, özellikler, nasıl çalıştırılır, lisanslar ve atıflar.

---

## 14. Ortam değişkenleri

| Değişken | Nerede | Açıklama |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yerel + Vercel | Supabase proje adresi |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yerel + Vercel | Supabase publishable/anon anahtarı (herkese açık olabilir, RLS korur) |
| `SUPABASE_SERVICE_ROLE_KEY` | yalnızca yerel | Seed ve zenginleştirme betikleri için. **Asla** Vercel'e ya da repoya konmaz |
| `SUPABASE_DB_PASSWORD` | yalnızca yerel | Supabase veritabanı şifresi. CLI işlemleri için. **Asla** Vercel'e ya da repoya konmaz |
| `GOOGLE_GENERATIVE_AI_API_KEY` | yerel + Vercel | Gemini anahtarı, yalnızca sunucuda kullanılır |
| `GEMINI_MODELS` | yerel + Vercel | Virgülle ayrılmış model sırası. Önce Flash-Lite |
| `AI_DAILY_LIMIT` | yerel + Vercel | Varsayılan 150 |
| `ALLOWED_EMAILS` | yerel + Vercel | Giriş yapabilecek e-postalar |
| `CRON_SECRET` | Vercel | Keepalive cron'unu korur |
| `APP_TIMEZONE` | yerel + Vercel | `Europe/Istanbul` |
| `DAY_START_HOUR` | yerel + Vercel | `4` |

---

## 15. Aşama 1 kabul kriterleri

Aşağıdakilerin hepsi telefonda ve bilgisayarda çalışıyorsa Aşama 1 bitmiş sayılır:

- [ ] Yalnızca izinli e-postayla giriş yapılabiliyor. Başka bir e-postayla giriş denendiğinde reddediliyor.
- [ ] Seviye tespiti ekranında işaretlenen kelimeler yeni kelime kuyruğuna girmiyor.
- [ ] Bugün ekranı dört görevi, seriyi ve ilerleme halkasını gösteriyor.
- [ ] 8 kelimelik grupta:
  - [ ] Kart çevrilebiliyor, döngü çalışıyor.
  - [ ] "Bildim" denen kelime sonraki turda gelmiyor.
  - [ ] Kelime kalmayınca soru çıkıyor. "Evet" grubu yeniden başlatıyor, "Hayır" sınava götürüyor.
- [ ] Grup sınavında cevap yazılıyor ve kontrol ediliyor. Doğru, neredeyse ve yanlış cevaplar ayrı gösteriliyor. Yanlışlar `Again` olarak işleniyor.
- [ ] Günlük test bütün gruplar bitince açılıyor ve puanı kaydediliyor.
- [ ] Ertesi gün tekrar kartları FSRS'e göre geliyor.
- [ ] En az 3 cümle kaydedilebiliyor.
- [ ] Bütün zorunlu görevler bitince gün tamamlanıyor: Kutlama gösteriliyor, seri artıyor, aktivite takviminde gün görünüyor.
- [ ] Bir gün kaçırıldığında dondurma hakkı otomatik kullanılıyor.
- [ ] Kelime bankasında arama, filtre, düzenleme ve dışa aktarma çalışıyor.
- [ ] Sayfa yenilendiğinde çalışma oturumu kaldığı yerden devam ediyor.
- [ ] `npm run lint`, `npm run typecheck` ve `npm test` sorunsuz geçiyor.
- [ ] Uygulama Vercel'de yayında ve telefonda ana ekrana eklenebiliyor.
