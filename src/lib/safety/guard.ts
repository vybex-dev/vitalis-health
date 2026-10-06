import {
  detectRedFlags,
  emergencyNotice,
  regionFromLocale,
  type EmergencyRegion,
  type RedFlagResult,
} from "@/lib/safety/redFlags";

/** Best-effort region from the browser's Accept-Language header ("en-IN,en;q=0.9" -> India). */
export function regionFromRequest(request: Request): EmergencyRegion {
  const first = (request.headers.get("accept-language") ?? "").split(",")[0]?.trim();
  return regionFromLocale(first);
}

export interface ChatTriage {
  flags: RedFlagResult;
  /** Streamed to the user immediately, before any model is called. null when nothing was detected. */
  preamble: string | null;
  /** Extra instruction for the model so its own reply stays consistent with the notice. */
  promptAddendum: string;
}

export function triageChatMessage(request: Request, lastUserText: string): ChatTriage {
  const flags = detectRedFlags(lastUserText);
  if (!flags.triggered) return { flags, preamble: null, promptAddendum: "" };
  const preamble = emergencyNotice(flags, regionFromRequest(request));
  const kinds = flags.matches.map((m) => m.label).join("; ");
  const promptAddendum = flags.crisis
    ? `\n\nSAFETY OVERRIDE: the user's latest message suggests a possible mental-health crisis (${kinds}). An emergency notice has already been shown above your reply. Respond with brief, warm, non-judgmental support, encourage contacting local emergency services or a crisis line and a trusted person, and do not provide any information about methods of self-harm. Keep it short.`
    : `\n\nSAFETY OVERRIDE: the user's latest message matched emergency red flags (${kinds}). An emergency notice has already been shown above your reply. Keep your reply short: reinforce calling emergency services now, offer simple immediate safety steps only if clearly safe and general, and do not suggest waiting or home treatment instead of emergency care.`;
  return { flags, preamble, promptAddendum };
}
