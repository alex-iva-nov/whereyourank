import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { publicEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<Awaited<ReturnType<typeof cookies>>["set"]>[2];
};

export const createSupabaseServerClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseClientKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookieList: CookieToSet[]) {
        cookieList.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components may read cookies but cannot always mutate them.
          }
        });
      },
    },
  });
};

export const createSupabaseRouteHandlerClient = (request: Request, response: NextResponse) => {
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseClientKey, {
    cookies: {
      getAll() {
        const cookieHeader = request.headers.get("cookie");
        if (!cookieHeader) {
          return [];
        }

        return cookieHeader.split(/;\s*/).filter(Boolean).map((cookie) => {
          const separatorIndex = cookie.indexOf("=");

          return {
            name: separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie,
            value: separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : "",
          };
        });
      },
      setAll(cookieList: CookieToSet[]) {
        cookieList.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
};
