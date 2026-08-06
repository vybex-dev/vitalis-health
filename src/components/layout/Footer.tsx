import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-teal-deep text-porcelain/70">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col justify-between gap-8 md:flex-row">
          <div className="max-w-sm">
            <Logo dark />
            <p className="mt-3 text-sm leading-relaxed">
              Vitalis helps you track vitals, medications, and symptoms, and turns them into
              plain-language guidance you can act on.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
            <div>
              <p className="mb-3 font-medium text-porcelain">Product</p>
              <ul className="flex flex-col gap-2">
                <li><a href="#features" className="hover:text-porcelain">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-porcelain">How it works</a></li>
                <li><a href="#safety" className="hover:text-porcelain">Safety</a></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 font-medium text-porcelain">Account</p>
              <ul className="flex flex-col gap-2">
                <li><Link href="/login" className="hover:text-porcelain">Sign in</Link></li>
                <li><Link href="/signup" className="hover:text-porcelain">Create account</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-porcelain/50">
          <p className="mb-2">
            Vitalis provides general health information and organizational tools. It is not a
            medical device, does not diagnose conditions, and is not a substitute for
            professional medical advice, diagnosis, or treatment. Always seek the advice of a
            qualified clinician, and call your local emergency number for emergencies.
          </p>
          <p>© {new Date().getFullYear()} Vitalis. Built as a demonstration product.</p>
        </div>
      </div>
    </footer>
  );
}
