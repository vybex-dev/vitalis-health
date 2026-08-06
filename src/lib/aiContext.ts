import type { UserProfile, VitalReading, Medication } from "@/types";

export function buildUserContext(
  profile: UserProfile | null,
  vitals: VitalReading[],
  medications: Medication[]
): string {
  const lines: string[] = [];

  if (profile) {
    const bits: string[] = [];
    if (profile.dob) bits.push(`DOB ${profile.dob}`);
    if (profile.sex) bits.push(profile.sex);
    if (profile.heightCm) bits.push(`${profile.heightCm}cm`);
    if (profile.weightKg) bits.push(`${profile.weightKg}kg`);
    if (bits.length) lines.push(`Profile: ${bits.join(", ")}`);
    if (profile.conditions?.length) lines.push(`Known conditions: ${profile.conditions.join(", ")}`);
    if (profile.allergies?.length) lines.push(`Allergies: ${profile.allergies.join(", ")}`);
  }

  const recentVitals = vitals.slice(0, 10);
  if (recentVitals.length) {
    lines.push(
      "Recent vitals: " +
        recentVitals
          .map((v) => `${v.type}=${v.value}${v.secondaryValue ? `/${v.secondaryValue}` : ""}${v.unit} (${v.recordedAt.slice(0, 10)})`)
          .join("; ")
    );
  }

  const activeMeds = medications.filter((m) => m.active);
  if (activeMeds.length) {
    lines.push("Active medications: " + activeMeds.map((m) => `${m.name} ${m.dosage}`).join("; "));
  }

  return lines.join("\n");
}
