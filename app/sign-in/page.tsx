import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BrandWordmark } from "@/components/brand-wordmark";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/server";
import { getUserDataCount } from "@/lib/product/user-data-count";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign In",
};

export default async function SignInPage() {
  const user = await getCurrentUser();

  if (user) {
    const profile = await getCurrentProfile(user.id);
    redirect(profile ? "/dashboard" : "/onboarding");
  }

  const { totalUsers } = await getUserDataCount();

  return (
    <main style={{ maxWidth: 420, margin: "60px auto", background: "#fff", padding: 24, borderRadius: 8 }}>
      <BrandWordmark subtitle="WHOOP benchmarks made simple." />
      <h1 style={{ margin: "18px 0 8px" }}>Sign in to your account</h1>
      <p style={{ color: "#444", margin: 0 }}>Access your benchmarks, early insights, and upload flow in one place.</p>
      <p style={{ color: "#444", marginTop: 8 }}>Built from data across {totalUsers} users.</p>
      <SignInForm />
    </main>
  );
}