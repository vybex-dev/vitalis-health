import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessagesSquare,
  Activity,
  Pill,
  ScanHeart,
  FileUp,
  BookHeart,
  Sparkles,
  UserRound,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Copilot", icon: MessagesSquare },
  { href: "/vitals", label: "Vitals", icon: Activity },
  { href: "/medications", label: "Medications", icon: Pill },
  { href: "/symptom-checker", label: "Symptom Checker", icon: ScanHeart },
  { href: "/documents", label: "Documents", icon: FileUp },
  { href: "/journal", label: "Journal", icon: BookHeart },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: UserRound },
];
