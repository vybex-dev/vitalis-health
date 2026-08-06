"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { GoogleGlyph } from "@/components/auth/GoogleGlyph";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithEmail, signInWithGoogle, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-soft">Sign in to pick up where you left off.</p>

      {!configured && (
        <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark">
          Firebase isn&apos;t configured yet in this environment — add your project keys to
          <code className="mx-1 rounded bg-white/60 px-1">.env.local</code> to enable sign-in. See README.md.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-alert">{error}</p>}

        <Button type="submit" loading={busy} className="mt-1 w-full justify-center">
          <LogIn className="size-4" /> Sign in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-ink-soft">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full justify-center" onClick={handleGoogle} loading={busy}>
        <GoogleGlyph /> Continue with Google
      </Button>

      <p className="mt-6 text-center text-sm text-ink-soft">
        New to Vitalis?{" "}
        <Link href="/signup" className="font-medium text-coral hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) {
    return "That email or password doesn't match our records.";
  }
  if (code.includes("too-many-requests")) return "Too many attempts. Try again in a bit.";
  if (code.includes("invalid-api-key") || code.includes("configuration-not-found")) {
    return "Firebase isn't configured yet — see README.md to add your project keys.";
  }
  return "Something went wrong signing you in. Please try again.";
}
