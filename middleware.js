import { NextResponse } from "next/server";

// Simple shared-password gate (HTTP Basic Auth) so the dashboard can be shared
// without a paid Vercel plan. The password is read from the SITE_PASSWORD env
// var. If SITE_PASSWORD is not set, the gate is OFF (the app behaves normally
// and stays protected by Vercel Authentication) so nothing locks up before the
// password is configured. Once SITE_PASSWORD is set and Vercel Authentication is
// turned off, visitors must enter the password to view any page or the data API.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

export function middleware(req) {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.next(); // gate not configured yet

  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6)); // "username:password"
      const pass = decoded.slice(decoded.indexOf(":") + 1);
      if (pass === pw) return NextResponse.next();
    } catch (e) {}
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="SEO Command Center", charset="UTF-8"' },
  });
}
