"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const ParticleField = dynamic(() => import("@/components/three/ParticleField"), { ssr: false });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-teal-deep px-5 py-12">
      <div className="absolute inset-0 opacity-70">
        <ParticleField />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-teal-deep/40 via-transparent to-teal-deep" />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo dark />
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-2xl sm:p-8">{children}</div>
      </div>
    </div>
  );
}
