import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const pathname = request.nextUrl.pathname;
  const isAppHost = host.startsWith("app.lumma.xyz") || host.startsWith("testnet.lumma.xyz");
  const isDocsHost = host.startsWith("docs.lumma.xyz");

  if (isAppHost) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/app", request.url));
    }
    if (!pathname.startsWith("/app") && !pathname.startsWith("/api")) {
      return NextResponse.rewrite(new URL(`/app${pathname}`, request.url));
    }
  }

  if (isDocsHost) {
    if (pathname === "/" || pathname === "") {
      return NextResponse.rewrite(new URL("/docs", request.url));
    }
    if (!pathname.startsWith("/docs") && !pathname.startsWith("/api")) {
      return NextResponse.rewrite(new URL(`/docs${pathname}`, request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

