"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateUserProfile } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Sex } from "@/types";

export default function ProfilePage() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || "");
    setDob(profile.dob || "");
    setSex((profile.sex as Sex) || "");
    setHeightCm(profile.heightCm ? String(profile.heightCm) : "");
    setWeightKg(profile.weightKg ? String(profile.weightKg) : "");
    setBloodType(profile.bloodType || "");
    setConditions((profile.conditions || []).join(", "));
    setAllergies((profile.allergies || []).join(", "));
    setContactName(profile.emergencyContact?.name || "");
    setContactPhone(profile.emergencyContact?.phone || "");
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    setBusy(true);
    setSaved(false);
    try {
      await updateUserProfile(user.uid, {
        displayName,
        dob: dob || null,
        sex: (sex || null) as Sex | null,
        heightCm: heightCm ? Number(heightCm) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        bloodType: bloodType || null,
        conditions: conditions.split(",").map((c) => c.trim()).filter(Boolean),
        allergies: allergies.split(",").map((a) => a.trim()).filter(Boolean),
        emergencyContact: contactName && contactPhone ? { name: contactName, phone: contactPhone, relation: "" } : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
        <p className="mt-1 text-sm text-ink-soft">This context helps the copilot personalize its answers.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input label="Email" value={user?.email ?? ""} disabled />
          <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          <Select label="Sex" value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="intersex">Intersex</option>
          </Select>
          <Input label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <Input label="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <Input label="Blood type" placeholder="e.g. O+" value={bloodType} onChange={(e) => setBloodType(e.target.value)} />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Health background</h2>
        <div className="flex flex-col gap-4">
          <Input
            label="Existing conditions (comma separated)"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
          />
          <Input
            label="Allergies (comma separated)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 font-display text-base font-semibold text-ink">Emergency contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Input label="Phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} loading={busy}>
          <Save className="size-4" /> Save changes
        </Button>
        {saved && <span className="text-sm text-sage-dark">Saved.</span>}
      </div>
    </div>
  );
}
