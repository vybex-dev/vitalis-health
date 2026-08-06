import { updateMedication } from "@/lib/firebase/repo";

export async function updateUserMedicationTaken(uid: string, medicationId: string) {
  await updateMedication(uid, medicationId, { lastTakenAt: new Date().toISOString() });
}
