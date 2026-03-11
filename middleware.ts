import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Keep middleware minimal for compatibility across local Windows environments.
  // Auth/session checks happen in server-side helpers and API routes.
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
