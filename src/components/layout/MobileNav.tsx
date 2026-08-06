"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/Logo";
import { NAV_ITEMS } from "@/components/layout/navItems";
import { useAuth } from "@/lib/auth/AuthContext";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { signOutUser } = useAuth();
  const current = NAV_ITEMS.find((n) => n.href === pathname);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-porcelain/90 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-2">
          {current && <span className="text-sm font-medium text-ink-2">{current.label}</span>}
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="p-2">
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-y-0 left-0 flex w-72 flex-col bg-teal-deep"
            >
              <div className="flex items-center justify-between px-5 py-5">
                <Logo dark />
                <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 text-white/70">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="flex-1 px-3">
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        active ? "bg-white/10 text-white" : "text-porcelain/60"
                      )}
                    >
                      <item.icon className="size-4.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-white/5 p-4">
                <button
                  onClick={() => signOutUser()}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-porcelain/60"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
