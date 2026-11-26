import { expect, type Page, test } from "@playwright/test";

// Günlük test + "Tarihi 1 gün ileri al" ile ertesi günün tekrarı (SPEC 5.4, 5.5).
// Geliştirici araçları gerektirir: yalnızca `npm run test:e2e:dev` ile (çalışan `npm run dev`e karşı) koşar.

const email = process.env.E2E_EMAIL ?? "";
const password = process.env.E2E_PASSWORD ?? "";

test.skip(process.env.E2E_DEV !== "1", "Yalnızca npm run test:e2e:dev ile çalışır (geliştirici araçları gerekir)");

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-posta").fill(email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("heading", { name: "Görevler" })).toBeVisible({ timeout: 60_000 });
}

async function resetClock(page: Page) {
  await page.goto("/me");
  const back = page.getByRole("button", { name: "Gerçek tarihe dön" });
  if (await back.isVisible()) await back.click();
}

test("günlük test, sonra ertesi gün tekrar ve 'Bilemedim' döngüsü", async ({ page }) => {
  test.setTimeout(240_000);
  await login(page);

  try {
    // --- Günlük test: bütün sorular yanlış, bir tanesine itiraz, kaydet ---
    await page.goto("/study/daily-test");
    await expect(page.getByRole("heading", { name: "Günlük test" })).toBeVisible();
    const save = page.getByRole("button", { name: "Kaydet" });
    for (let i = 0; i < 40 && !(await save.isVisible()); i++) {
      await page.locator("#quiz-answer").fill("x");
      await page.locator("#quiz-answer").press("Enter");
      await page.getByRole("button", { name: /Sonraki|Sonuçları gör/ }).click();
    }
    await expect(save).toBeVisible();
    await page.getByRole("button", { name: "Aslında doğruydu" }).first().click();
    await expect(page.getByText("İtiraz edildi — doğru sayıldı").first()).toBeVisible();
    await save.click();
    await expect(page.getByText(/Kaydedildi\. Puanın %\d+/)).toBeVisible({ timeout: 30_000 });

    await page.goto("/");
    const dailyRow = page.getByRole("link", { name: /Günlük test/ });
    await expect(dailyRow).toContainText("Tamamlandı");

    // --- Ertesi gün: geliştirici aracıyla tarihi ileri al ---
    await page.goto("/me");
    await expect(page.getByText("TEST", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Tarihi 1 gün ileri al" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Geliştirici: tarih \+1 gün/)).toBeVisible();
    await expect(page.getByRole("link", { name: /Tekrar/ })).toContainText("0/8");

    // --- Tekrar: ilk karta Bilemedim, kalanlara Bildim; 5. kart yazılı (yanlış) ---
    await page.goto("/study/review");
    await expect(page.getByText("1/8")).toBeVisible();
    for (let i = 0; i < 8; i++) {
      const input = page.locator("#quiz-answer");
      if (await input.isVisible()) {
        await input.fill("zz-yanlis");
        await input.press("Enter");
        await expect(page.getByText("Yanlış", { exact: true })).toBeVisible();
        await page.getByRole("button", { name: /Sonraki|Sonuçları gör/ }).click();
      } else {
        await page.keyboard.press(" ");
        await page.keyboard.press(i === 0 ? "1" : "2");
      }
    }

    // Ek tur: ilk kart (Bilemedim) ve yazılı soruda yanlış yapılan kart geri gelir.
    await expect(page.getByText(/Bilemediklerin — 2 kart kaldı/)).toBeVisible();
    // Kayıtlar bitmeden sayfa yenilense de oturum ve bekleyen cevaplar korunur.
    await page.reload();
    await expect(page.getByText(/Bilemediklerin — 2 kart kaldı/)).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press(" ");
    await page.keyboard.press("1"); // yine bilemedim → sona gider, döngüde kalır
    await expect(page.getByText(/Bilemediklerin — 2 kart kaldı/)).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press(" ");
      await page.keyboard.press("2");
    }
    await page.keyboard.press(" ");
    await page.keyboard.press("2");
    await expect(page.getByText("✓ Tekrar bitti!")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Cevaplar kaydediliyor/)).toHaveCount(0, { timeout: 60_000 });

    await page.goto("/");
    const reviewRow = page.getByRole("link", { name: /Tekrar/ });
    await expect(reviewRow).toContainText("Tamamlandı");
    await expect(reviewRow).toContainText("8/8");
  } finally {
    await resetClock(page);
  }
});
