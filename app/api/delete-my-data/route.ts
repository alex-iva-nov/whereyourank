import { NextResponse } from "next/server";

import { deleteUserDataForMvp } from "@/lib/user/delete-data";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { revalidateUserDataCount } from "@/lib/product/user-data-count";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server-client";

export async function POST(request: Request) {
  const authResponse = NextResponse.next();
  const supabase = createSupabaseRouteHandlerClient(request, authResponse);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await deleteUserDataForMvp(user.id);

    // NOTE: Counsel review recommended before scale: deleting auth account enforces non-linkability after deletion.
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      throw new Error(`Failed to delete auth account: ${deleteAuthError.message}`);
    }

    await supabase.auth.signOut();

    revalidateUserDataCount();

    const response = NextResponse.json({ ok: true, result });
    authResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete-my-data failed" },
      { status: 500 },
    );
  }
}
