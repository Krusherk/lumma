import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;
  const isAppHost = host.startsWith("app.lumma.xyz") || host.startsWith("testnet.lumma.xyz");
  if (isAppHost && pathname === "/") {
    return NextResponse.rewrite(new URL("/app", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

