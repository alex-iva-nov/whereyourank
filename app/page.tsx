import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/server";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  redirect("/dashboard");
}
