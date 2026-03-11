import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandWordmark } from "@/components/brand-wordmark";
import { getCurrentProfile, requireUser } from "@/lib/auth/server";
import { getUserDataCount } from "@/lib/product/user-data-count";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Complete Your Profile",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile(user.id);

  if (profile) {
    redirect("/dashboard");
  }

  const { totalUsers } = await getUserDataCount();

  return (
    <main style={{ maxWidth: 520, margin: "60px auto", background: "#fff", padding: 24, borderRadius: 8 }}>
      <BrandWordmark subtitle="A quick setup before your first benchmark." />
      <h1 style={{ margin: "18px 0 8px" }}>Complete your profile</h1>
      <p style={{ color: "#444", margin: 0 }}>We only ask for the basics needed to compare your results with similar users.</p>
      <p style={{ color: "#444", marginTop: 8 }}>Built from data across {totalUsers} users.</p>
      <p style={{ color: "#555" }}>
        Review the <Link href="/privacy">Privacy Notice</Link> and <Link href="/terms">Terms of Use</Link>.
      </p>
      <OnboardingForm />
    </main>
  );
}