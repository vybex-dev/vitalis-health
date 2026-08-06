"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { EmergencyButton } from "@/components/ui/EmergencyBanner";
import { FullPageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthContext";

function OnboardingCheck({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (profile && !profile.onboarded) router.replace("/onboarding");
  }, [profile, router]);

  if (profile && !profile.onboarded) {
    return <FullPageSpinner label="Setting things up…" />;
  }

  return <>{children}</>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <OnboardingCheck>
        <div className="min-h-screen bg-porcelain">
          <Sidebar />
          <MobileNav />
          <main className="md:pl-64">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
          </main>
          <EmergencyButton />
        </div>
      </OnboardingCheck>
    </AuthGuard>
  );
}
