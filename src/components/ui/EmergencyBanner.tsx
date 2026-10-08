// src/components/ui/EmergencyBanner.tsx: Emergency call button/banner component.
"use client";

import { useState } from "react";
import { Phone, Siren } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useEmergencyRegion } from "@/hooks/useEmergencyRegion";
import { EMERGENCY_REGIONS } from "@/lib/safety/redFlags";

export function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();
  const [region, chooseRegion] = useEmergencyRegion();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-alert px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(211,67,49,0.6)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Emergency help"
      >
        <Siren className="size-4" />
        <span className="hidden sm:inline">Emergency</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Getting help right now">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Vitalis is not equipped to handle emergencies. If this is a medical emergency —
            chest pain, trouble breathing, severe bleeding, stroke signs, or anything
            life-threatening — contact emergency services immediately.
          </p>

          <a href={`tel:${region.emergency}`}>
            <Button variant="danger" className="w-full justify-center">
              <Phone className="size-4" /> Call {region.emergency} ({region.name} emergency line)
            </Button>
          </a>

          {region.crisis && (
            <a href={`tel:${region.crisis.number.replace(/\s/g, "")}`}>
              <Button variant="outline" className="w-full justify-center">
                <Phone className="size-4" /> {region.crisis.name}: {region.crisis.number}
              </Button>
            </a>
          )}

          {profile?.emergencyContact?.phone ? (
            <a href={`tel:${profile.emergencyContact.phone}`}>
              <Button variant="outline" className="w-full justify-center">
                <Phone className="size-4" />
                Call {profile.emergencyContact.name || "your emergency contact"}
              </Button>
            </a>
          ) : (
            <p className="rounded-xl bg-porcelain-2 p-3 text-xs text-ink-soft">
              You haven&apos;t added an emergency contact yet. Add one in your Profile so it&apos;s
              one tap away next time.
            </p>
          )}

          <label className="flex items-center gap-2 text-xs text-ink-soft">
            Country
            <select
              value={region.code}
              onChange={(e) => chooseRegion(e.target.value)}
              className="rounded-lg border border-border-strong bg-white px-2 py-1 text-xs text-ink"
            >
              {EMERGENCY_REGIONS.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </label>
        </div>
      </Modal>
    </>
  );
}
