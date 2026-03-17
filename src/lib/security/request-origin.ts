import { publicEnv } from "../env.ts";

const getOrigin = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

export const isAllowedMutationOrigin = (request: Request): boolean => {
  const allowedOrigins = new Set<string>();
  const requestOrigin = getOrigin(request.url);
  const appOrigin = getOrigin(publicEnv.appUrl);

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  if (appOrigin) {
    allowedOrigins.add(appOrigin);
  }

  const sourceOrigin =
    getOrigin(request.headers.get("origin")) ?? getOrigin(request.headers.get("referer"));

  return sourceOrigin != null && allowedOrigins.has(sourceOrigin);
};
