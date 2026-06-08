import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BookOpen, PenTool, BarChart3, Activity, RotateCcw, LogOut } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/curriculum", label: "Lectures", icon: BookOpen },
    { href: "/assignments", label: "Assignments", icon: PenTool },
    { href: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const displayName =
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.username ||
    "Signed in";

  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full h-screen sticky top-0">
      <div className="p-6 border-b border-border">
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
              +
            </div>
            <span className="font-serif font-semibold text-lg tracking-tight">DevMath</span>
          </div>
        </Link>
      </div>

      <div className="flex-1 py-6 flex flex-col gap-2 px-4">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Signed in as</p>
          <p className="text-sm font-medium truncate" title={displayName}>
            {displayName}
          </p>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: basePath || "/" })}
          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
}

function TopBar() {
  const [location, setLocation] = useLocation();
  const active = location.startsWith("/diagnostics");
  const qc = useQueryClient();
  const [resetting, setResetting] = useState(false);

  async function handleReset() {
    if (
      !confirm(
        "Reset the course? This deletes every assignment attempt, answer, and practice session, but keeps lectures and assignments.",
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch("/api/diagnostics/reset", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await qc.invalidateQueries();
      setLocation("/");
    } catch (e) {
      alert(`Reset failed: ${(e as Error).message}`);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="sticky top-0 z-10 flex items-center justify-end gap-2 px-6 py-3 border-b border-border bg-background/80 backdrop-blur">
      <button
        onClick={handleReset}
        disabled={resetting}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-secondary disabled:opacity-50"
        data-testid="button-reset"
        title="Wipe all student progress (keeps lectures and assignments)"
      >
        <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
        {resetting ? "Resetting…" : "Reset course"}
      </button>
      <Link href="/diagnostics">
        <button
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active
              ? "bg-primary text-primary-foreground"
              : "border border-border hover:bg-secondary"
          }`}
          data-testid="button-diagnostic"
        >
          <Activity className="w-4 h-4" />
          Diagnostic
        </button>
      </Link>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <TopBar />
        {children}
      </main>
    </div>
  );
}
