"use client";

import { useEffect, useState } from "react";
import { Save, AlertTriangle, Download, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { updateUserProfile, deleteAllUserData } from "@/lib/firebase/repo";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/store/toastStore";
import type { Sex } from "@/types";

export default function ProfilePage() {
  const { user, profile, signOutUser } = useAuth();
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
  const [contactRelation, setContactRelation] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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
    setContactRelation(profile.emergencyContact?.relation || "");
  }, [profile]);

  async function handleSave() {
    if (!user) return;
    setBusy(true);
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
        emergencyContact:
          contactName && contactPhone
            ? { name: contactName, phone: contactPhone, relation: contactRelation }
            : null,
      });
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile.");
    } finally {
      setBusy(false);
    }
  }

  function handleExportData() {
    if (!profile) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profile, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `vitalis_health_profile_${user?.uid}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Health profile exported!");
  }

  async function handleResetData() {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, {
        conditions: [],
        allergies: [],
        emergencyContact: null,
        dob: null,
        heightCm: null,
        weightKg: null,
        bloodType: null,
      });
      setConditions("");
      setAllergies("");
      setContactName("");
      setContactPhone("");
      setContactRelation("");
      setDob("");
      setHeightCm("");
      setWeightKg("");
      setBloodType("");
      setDeleteModalOpen(false);
      toast.info("Profile medical history cleared.");
    } catch {
      toast.error("Failed to reset profile data.");
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setBusy(true);
    try {
      await deleteAllUserData(user.uid);
      toast.error("All your data has been deleted.");
      signOutUser();
    } catch {
      toast.error("Failed to delete account data.");
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          <Input label="Phone" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          <Select
            label="Relation"
            value={contactRelation}
            onChange={(e) => setContactRelation(e.target.value)}
          >
            <option value="">Select relation</option>
            <option value="Spouse">Spouse / Partner</option>
            <option value="Parent">Parent</option>
            <option value="Child">Child</option>
            <option value="Sibling">Sibling</option>
            <option value="Friend">Friend</option>
            <option value="Doctor">Primary Care Doctor</option>
            <option value="Other">Other</option>
          </Select>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button onClick={handleSave} loading={busy}>
          <Save className="size-4" /> Save changes
        </Button>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportData}>
            <Download className="size-4" /> Export my profile (JSON)
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteModalOpen(true)}>
            <Trash2 className="size-4" /> Clear Profile Data
          </Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteAccountModalOpen(true)}>
            <AlertTriangle className="size-4" /> Delete All My Data
          </Button>
        </div>
      </div>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Clear Profile Data">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-2">
            Are you sure you want to clear your saved conditions, allergies, and emergency contact from your profile?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleResetData}>
              Clear Data
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteAccountModalOpen} onClose={() => setDeleteAccountModalOpen(false)} title="Delete All My Data">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-coral">
            <AlertTriangle className="size-5" />
            <p className="font-medium">Warning: This action is permanent and cannot be undone.</p>
          </div>
          <p className="text-sm text-ink-2">
            This will permanently delete your health profile, all vital readings, journal entries, documents, and chat history.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">
              Type <span className="font-bold text-coral">DELETE</span> to confirm
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteAccountModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmation !== "DELETE"}
              onClick={handleDeleteAccount}
              loading={busy}
            >
              Delete Everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
