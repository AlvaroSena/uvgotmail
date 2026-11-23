import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/** Optimistic check only: real authorization happens in the data layer (requireViewer). */
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/signon", request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/chat/:path*", "/members/:path*", "/call/:path*"] };
