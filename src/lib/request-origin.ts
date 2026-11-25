// İsteğin geldiği adres (ör. http://172.20.10.4:3000). Yönlendirmeler hep bu adrese yapılır:
// telefonda istenen giriş bağlantısı telefonda açılır.
//
// Neden request.nextUrl.origin değil: `next dev -H 0.0.0.0` ile çalışırken route handler'larda
// nextUrl.origin "http://0.0.0.0:3000" olur; tarayıcı bu adrese gidemez. Host başlığı ise
// tarayıcının gerçekten kullandığı adresi taşır.

const HOST_PATTERN = /^[a-z0-9.\-[\]:]+$/i;

export function requestOrigin(headers: Headers, fallbackOrigin: string): string {
  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim();
  if (!host || !HOST_PATTERN.test(host) || host.startsWith("0.0.0.0")) return fallbackOrigin;
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const proto =
    forwardedProto === "https" || forwardedProto === "http"
      ? forwardedProto
      : new URL(fallbackOrigin).protocol.replace(":", "");
  return `${proto}://${host}`;
}
