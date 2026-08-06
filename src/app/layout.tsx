import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vitalis — AI Personal Healthcare Copilot",
  description:
    "Vitalis tracks your vitals, medications, and symptoms, and uses AI to turn them into clear, honest guidance — without replacing your doctor.",
};

export const viewport: Viewport = {
  themeColor: "#f4f7f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
