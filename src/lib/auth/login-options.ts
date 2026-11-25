// Giriş seçenekleri (sunucu tarafı). EMAIL_CODE_LOGIN=true yalnızca kendi SMTP'n kurulup
// Supabase "Magic Link" e-posta şablonuna {{ .Token }} eklendikten sonra açılmalı:
// ücretsiz plandaki varsayılan şablonda kod yer almaz.

export function isEmailCodeLoginEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.EMAIL_CODE_LOGIN === "true";
}
