"use client";

import { Phone, Siren } from "lucide-react";
import { emergencyNotice, type RedFlagResult } from "@/lib/safety/redFlags";
import { useEmergencyRegion } from "@/hooks/useEmergencyRegion";

/** Shown instantly, client-side and with no network, when the user's text matches an emergency pattern. */
export function EmergencyNotice({ flags }: { flags: RedFlagResult }) {
  const [region] = useEmergencyRegion();
  if (!flags.triggered) return null;
  const text = emergencyNotice(flags, region).replace(/\*\*/g, "");
  return (
    <div role="alert" className="mt-2 rounded-2xl border border-alert/40 bg-alert-light p-4">
      <p className="flex items-start gap-2 text-sm font-medium text-alert-dark">
        <Siren className="mt-0.5 size-4 shrink-0" /> {text}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`tel:${region.emergency}`} className="inline-flex items-center gap-2 rounded-xl bg-alert px-4 py-2 text-sm font-semibold text-white">
          <Phone className="size-4" /> Call {region.emergency}
        </a>
        {flags.crisis && region.crisis && (
          <a href={`tel:${region.crisis.number.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-xl border border-alert/50 px-4 py-2 text-sm font-semibold text-alert-dark">
            <Phone className="size-4" /> {region.crisis.name}: {region.crisis.number}
          </a>
        )}
      </div>
    </div>
  );
}
