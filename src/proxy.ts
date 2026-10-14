import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  // Check for a user, not just a session object: a misconfigured provider
  // returns an error object here, which must not count as logged in
  if (!req.auth?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|logo.svg).*)"],
};
