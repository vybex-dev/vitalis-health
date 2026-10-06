"use client";

import { useCallback, useEffect, useState } from "react";
import { EMERGENCY_REGIONS, regionFromLocale, type EmergencyRegion } from "@/lib/safety/redFlags";

const KEY = "vitalis:emergency-region";

/** Emergency numbers differ by country (911 is US/Canada only). Detect from the browser, let the user override. */
export function useEmergencyRegion(): [EmergencyRegion, (code: string) => void] {
  const [region, setRegion] = useState<EmergencyRegion>(EMERGENCY_REGIONS[0]);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      /* storage unavailable */
    }
    const detected = regionFromLocale(navigator.language);
    const chosen = EMERGENCY_REGIONS.find((r) => r.code === saved) ?? detected;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- must read browser-only state after mount to avoid a hydration mismatch
    setRegion(chosen);
  }, []);

  const choose = useCallback((code: string) => {
    const r = EMERGENCY_REGIONS.find((x) => x.code === code);
    if (!r) return;
    setRegion(r);
    try {
      window.localStorage.setItem(KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  return [region, choose];
}
