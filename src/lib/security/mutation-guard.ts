import { NextResponse } from "next/server";

import { isAllowedMutationOrigin } from "./request-origin";

export const ensureValidMutationRequest = (request: Request): NextResponse | null => {
  if (!isAllowedMutationOrigin(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
};
