export interface Language {
  code: string;
  label: string; // native name
  english: string;
  rtl?: boolean;
  /** BCP-47 tag for the browser's speech synthesis. */
  speech: string;
}

export const LANGUAGES: Language[] = [
  { code: "en", label: "English", english: "English", speech: "en-US" },
  { code: "hi", label: "हिन्दी", english: "Hindi", speech: "hi-IN" },
  { code: "es", label: "Español", english: "Spanish", speech: "es-ES" },
  { code: "bn", label: "বাংলা", english: "Bengali", speech: "bn-IN" },
  { code: "ta", label: "தமிழ்", english: "Tamil", speech: "ta-IN" },
  { code: "mr", label: "मराठी", english: "Marathi", speech: "mr-IN" },
  { code: "fr", label: "Français", english: "French", speech: "fr-FR" },
  { code: "pt", label: "Português", english: "Portuguese", speech: "pt-BR" },
  { code: "ar", label: "العربية", english: "Arabic", rtl: true, speech: "ar-SA" },
];

export function languageByCode(code: string | undefined | null): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
