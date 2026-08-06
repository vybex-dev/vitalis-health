"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { GoogleGlyph } from "@/components/auth/GoogleGlyph";

export default function SignupPage() {
  const router = useRouter();
  const { user, loading, signUpWithEmail, signInWithGoogle, configured } = useAuth();
  const [name, setName] = useState("");
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
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setBusy(true);
    try {
      await signUpWithEmail(email, password, name);
      router.replace("/onboarding");
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
      router.replace("/onboarding");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">Free to start. Takes under a minute.</p>

      {!configured && (
        <p className="mt-4 rounded-xl bg-amber-light p-3 text-xs text-amber-dark">
          Firebase isn&apos;t configured yet in this environment — add your project keys to
          <code className="mx-1 rounded bg-white/60 px-1">.env.local</code> to enable sign-up. See README.md.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
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
          autoComplete="new-password"
          required
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-alert">{error}</p>}

        <Button type="submit" loading={busy} className="mt-1 w-full justify-center">
          <UserPlus className="size-4" /> Create account
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
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-coral hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-ink-soft">
        By continuing you agree Vitalis provides general health information only and is not a
        substitute for professional medical care.
      </p>
    </div>
  );
}

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code.includes("email-already-in-use")) return "An account already exists with that email.";
  if (code.includes("weak-password")) return "Choose a stronger password.";
  if (code.includes("invalid-email")) return "That email address doesn't look right.";
  if (code.includes("invalid-api-key") || code.includes("configuration-not-found")) {
    return "Firebase isn't configured yet — see README.md to add your project keys.";
  }
  return "Something went wrong creating your account. Please try again.";
}
