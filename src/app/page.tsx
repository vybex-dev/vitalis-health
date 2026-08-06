import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Trust } from "@/components/landing/Trust";
import { CTA } from "@/components/landing/CTA";
import { PulseLine } from "@/components/three/PulseLine";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-porcelain">
      <Navbar />
      <main>
        <Hero />
        <PulseLine className="mx-auto max-w-6xl px-5" />
        <Features />
        <HowItWorks />
        <PulseLine className="mx-auto max-w-6xl px-5" />
        <Trust />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
