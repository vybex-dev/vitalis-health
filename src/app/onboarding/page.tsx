"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, SkipForward } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateUserProfile } from "@/lib/firebase/repo";
import type { Sex } from "@/types";

function OnboardingForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(skip = false) {
    if (!user) return;
    setBusy(true);
    try {
      await updateUserProfile(user.uid, {
        dob: dob || null,
        sex: (sex || null) as Sex | null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        conditions: skip ? [] : splitList(conditions),
        allergies: skip ? [] : splitList(allergies),
        emergencyContact:
          !skip && contactName && contactPhone ? { name: contactName, phone: contactPhone, relation: "" } : null,
        onboarded: true,
      });
      router.replace("/dashboard");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      <div className="rounded-2xl border border-border bg-white p-7 shadow-[var(--shadow-card)] sm:p-8">
        <h1 className="font-display text-2xl font-semibold text-ink">A quick health profile</h1>
        <p className="mt-1 text-sm text-ink-soft">
          This helps the copilot give you more relevant answers. Everything is optional and
          editable later in Profile.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <Select label="Sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
          </Select>
          <Input
            label="Height (cm)"
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <Input
            label="Existing conditions (comma separated)"
            placeholder="e.g. asthma, type 2 diabetes"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
          <Input
            label="Allergies (comma separated)"
            placeholder="e.g. penicillin, peanuts"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Emergency contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
            <Input
              label="Emergency contact phone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => save(true)} disabled={busy}>
            <SkipForward className="size-4" /> Skip for now
          </Button>
          <Button onClick={() => save(false)} loading={busy}>
            Continue <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function splitList(s: string) {
  return s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function OnboardingPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-porcelain px-5 py-12">
        <OnboardingForm />
      </div>
    </AuthGuard>
  );
}
