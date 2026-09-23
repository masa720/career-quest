import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon-red.svg|icon-192.png|icon-512.png|apple-touch-icon.png|manifest.webmanifest|robots.txt|sw.js|offline.html).*)",
  ],
};
