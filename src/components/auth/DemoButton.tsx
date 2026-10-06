"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";

/** One click into a fully populated app with a fictional patient. No sign-up, no typing. */
export function DemoButton({ className, variant = "secondary" }: { className?: string; variant?: "secondary" | "outline" | "primary" }) {
  const router = useRouter();
  const { signInAsDemo, configured } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await signInAsDemo();
      router.replace("/dashboard");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      setError(
        code.includes("admin-restricted") || code.includes("operation-not-allowed")
          ? "Demo mode needs Anonymous sign-in enabled in the Firebase console (see README)."
          : "Couldn't start the demo. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" variant={variant} onClick={go} loading={busy} disabled={!configured} className="w-full justify-center">
        <FlaskConical className="size-4" /> Try the demo (sample patient, no sign-up)
      </Button>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
    </div>
  );
}
