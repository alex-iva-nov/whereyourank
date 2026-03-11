import { redirect } from "next/navigation";

import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const profile = await getCurrentProfile(user.id);
  if (!profile) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
