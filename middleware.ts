import { type NextRequest, NextResponse } from "next/server";

const hasSupabaseAuthCookie = (request: NextRequest) =>
  request.cookies.getAll().some(({ name, value }) => Boolean(value) && name.startsWith("sb-") && name.includes("-auth-token"));

export function middleware(request: NextRequest) {
  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
