import { expect, test } from "@playwright/test";

// Giriş akışı (SPEC 3, 15): e-posta + şifre, izin listesi, uzun süren oturum, çıkış.
// Yalnızca test kullanıcısı kullanılır.

const email =
  process.env.E2E_EMAIL ??
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .find((e) => e.includes("+test@")) ??
  "";
const password = process.env.E2E_PASSWORD ?? "";

test.describe("giriş", () => {
  test("oturum yokken her sayfa /login'e yönlendirir", async ({ page }) => {
    await page.goto("/study/new");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Giriş yap" })).toBeVisible();
    await expect(page.getByLabel("Şifre")).toBeVisible();
  });

  test("izin listesinde olmayan e-posta reddedilir", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-posta").fill("yabanci@example.com");
    await page.getByLabel("Şifre").fill("herhangi-bir-sifre");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.locator("#login-error")).toHaveText(/Bu uygulama özel/);
  });

  test("e-posta kodu seçeneği, açılmadıkça görünmez", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /E-posta koduyla gir/ })).toHaveCount(0);
  });

  test("yanlış şifre hata verir ve e-postayı korur", async ({ page }) => {
    test.skip(!email, "Test kullanıcısı e-postası yok (ALLOWED_EMAILS içinde +test adresi gerekli)");
    await page.goto("/login");
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre").fill("kesinlikle-yanlis-sifre-123");
    await page.getByRole("button", { name: "Giriş yap" }).click();
    await expect(page.locator("#login-error")).toHaveText("E-posta ya da şifre hatalı.");
    await expect(page.getByLabel("E-posta")).toHaveValue(email);
  });

  test("doğru şifreyle girer, oturum uzun süreli kalır ve çıkış yapılabilir", async ({ page, context }) => {
    test.skip(!email || !password, "E2E_PASSWORD .env.local içinde tanımlı değil");

    await page.goto("/login");
    await page.getByLabel("E-posta").fill(email);
    await page.getByLabel("Şifre").fill(password);
    await page.getByRole("button", { name: "Giriş yap" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Görevler" })).toBeVisible();

    // Oturum çerezi en az 300 gün geçerli: telefonda bir kez girmek yeter.
    const authCookies = (await context.cookies()).filter((c) => c.name.includes("auth-token"));
    expect(authCookies.length).toBeGreaterThan(0);
    const minExpiry = Date.now() / 1000 + 300 * 24 * 60 * 60;
    for (const c of authCookies) expect(c.expires).toBeGreaterThan(minExpiry);
    // http üzerinden (telefondan yerel ağ) çalışabilmesi için Secure olmamalı.
    for (const c of authCookies) expect(c.secure).toBe(false);

    // Sayfa yenilenince ve yeni sekmede oturum sürer.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Görevler" })).toBeVisible();
    const second = await context.newPage();
    await second.goto("/me");
    await expect(second.getByRole("heading", { name: "Ben" })).toBeVisible();

    // Giriş yapmışken /login, Bugün'e döner.
    await second.goto("/login");
    await expect(second).toHaveURL(/\/$/);

    // Çıkış
    await second.goto("/me");
    await second.getByRole("button", { name: "Çıkış yap" }).click();
    await expect(second).toHaveURL(/\/login$/);
    await second.goto("/");
    await expect(second).toHaveURL(/\/login$/);
  });
});
