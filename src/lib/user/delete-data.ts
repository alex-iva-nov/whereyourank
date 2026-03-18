import { publicEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin-client";
import { createDeleteUserDataForMvp, type DeleteDataDeps } from "./delete-data-core";

const defaultDeps: DeleteDataDeps = {
  db: supabaseAdmin,
  storageBucketRaw: publicEnv.storageBucketRaw,
  now: () => new Date().toISOString(),
};

export const deleteUserDataForMvp = createDeleteUserDataForMvp(defaultDeps);
