import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isEmailAllowed } from "@/lib/auth/allowed-emails";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

// Giriş yapmadan açılabilen yollar.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// Her istekte oturumu yeniler; giriş yoksa ya da e-posta izinli değilse /login'e yönlendirir.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // createServerClient ile getClaims arasına kod koyma: oturum yenilemesi bozulur.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const { pathname } = request.nextUrl;

  const redirectTo = (path: string, error?: string) => {
    const target = request.nextUrl.clone();
    target.pathname = path;
    target.search = error ? `?error=${error}` : "";
    const redirect = NextResponse.redirect(target);
    // Yenilenen oturum cookie'lerini yönlendirmeye taşı.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (claims && !isEmailAllowed(email)) {
    // İzinsiz bir hesapla oturum açılmışsa kapat.
    await supabase.auth.signOut();
    if (pathname === "/login") return response;
    return redirectTo("/login", "private");
  }

  if (!claims && !isPublicPath(pathname)) {
    return redirectTo("/login");
  }

  if (claims && pathname === "/login") {
    return redirectTo("/");
  }

  return response;
}
