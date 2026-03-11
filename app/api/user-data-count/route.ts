import { NextResponse } from "next/server";

import { getUserDataCount } from "@/lib/product/user-data-count";

export async function GET() {
  const { totalUsers } = await getUserDataCount();

  return NextResponse.json({ totalUsers }, { status: 200 });
}