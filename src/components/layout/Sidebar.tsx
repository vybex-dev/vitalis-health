"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { NAV_ITEMS } from "@/components/layout/navItems";
import { useAuth } from "@/lib/auth/AuthContext";

export function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOutUser } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/5 bg-teal-deep md:flex">
      <div className="px-6 py-6">
        <Link href="/dashboard">
          <Logo dark />
        </Link>
      </div>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-white/10 text-white" : "text-porcelain/60 hover:bg-white/5 hover:text-porcelain"
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-coral/20 text-sm font-semibold text-coral">
            {initials(profile?.displayName || user?.displayName || user?.email || "V")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {profile?.displayName || user?.displayName || "Your account"}
            </p>
            <p className="truncate text-xs text-porcelain/50">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOutUser()}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-porcelain/60 transition-colors hover:bg-white/5 hover:text-porcelain"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </aside>
  );
}
