"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SidebarNavItem, type NavItem } from "./SidebarNavItem";
import { useSettingsStore } from "@/stores/settingsStore";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";
import { type AdminRole } from "@/types";
import { cn } from "@/lib/utils";

// ─── Nav definition ──────────────────────────────────────────────────────────
// roles: which roles can see this item ("all" is expanded below)
const ALL_ROLES: AdminRole[] = ["super_admin", "admin", "teacher", "bursar"];

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        emoji: "🏠",
        roles: ALL_ROLES,
      },
    ],
  },
  {
    label: "Academics",
    items: [
      {
        href: "/students",
        label: "Students",
        emoji: "👥",
        roles: ALL_ROLES,
      },
      {
        href: "/scores",
        label: "Score Upload",
        emoji: "📊",
        roles: ["super_admin", "admin", "teacher"],
      },
      {
        href: "/report-cards",
        label: "Report Cards",
        emoji: "📋",
        roles: ["super_admin", "admin", "teacher"],
      },
      {
        href: "/assignments",
        label: "Assignments",
        emoji: "📝",
        roles: ["super_admin", "admin", "teacher"],
      },
      {
        href: "/submissions",
        label: "Submissions",
        emoji: "📨",
        roles: ["super_admin", "admin", "teacher"],
      },
      {
        href: "/leaderboard",
        label: "Leaderboard",
        emoji: "⭐",
        roles: ["super_admin", "admin", "teacher"],
      },
    ],
  },
  {
    label: "Exams",
    items: [
      {
        href: "/question-bank",
        label: "Question Bank",
        emoji: "📚",
        roles: ["super_admin", "admin", "teacher"],
      },
      {
        href: "/exam-builder",
        label: "Exam Builder",
        emoji: "📄",
        roles: ["super_admin", "admin", "teacher"],
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        href: "/fees",
        label: "Fee Structure",
        emoji: "💰",
        roles: ["super_admin", "admin", "bursar"],
      },
      {
        href: "/payments",
        label: "Payment Review",
        emoji: "✅",
        roles: ["super_admin", "admin", "bursar"],
      },
      {
        href: "/revenue",
        label: "Revenue Reports",
        emoji: "📈",
        roles: ["super_admin", "admin", "bursar"],
      },
    ],
  },
  {
    label: "Communication",
    items: [
      {
        href: "/complaints",
        label: "Complaints",
        emoji: "💬",
        roles: ["super_admin", "admin"],
        badge: 0, // filled dynamically
      },
      {
        href: "/announcements",
        label: "Announcements",
        emoji: "📢",
        roles: ["super_admin", "admin", "teacher"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        href: "/settings",
        label: "Settings",
        emoji: "⚙️",
        roles: ["super_admin", "admin"],
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const { user } = useAuthStore();
  const role = user?.role ?? "teacher";

  const supabase = createClient();

  const { data: openComplaintsCount = 0 } = useQuery({
    queryKey: ["complaints", "open-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("complaints")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count ?? 0;
    },
    refetchInterval: 60_000,
    enabled: ["super_admin", "admin"].includes(role),
  });

  // Inject live badge count + filter by role
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => item.roles.includes(role))
      .map((item) =>
        item.href === "/complaints"
          ? { ...item, badge: openComplaintsCount }
          : item
      ),
  })).filter((group) => group.items.length > 0);

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#1B2B5E] transition-all duration-300 shrink-0",
        sidebarCollapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className={cn(
          "flex h-14 items-center border-b border-white/10 shrink-0",
          sidebarCollapsed ? "justify-center px-2" : "gap-2.5 px-4"
        )}
      >
        <span className="text-2xl leading-none shrink-0">🎓</span>
        {!sidebarCollapsed && (
          <div className="leading-tight">
            <p className="text-white text-sm font-bold truncate">Reigning Star</p>
            <p className="text-white/50 text-[11px]">Admin Portal</p>
          </div>
        )}
      </Link>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-none">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!sidebarCollapsed && (
              <p className="mb-0.5 px-4 pt-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                {group.label}
              </p>
            )}
            {group.items.map((item) => (
              <SidebarNavItem
                key={item.href}
                {...item}
                collapsed={sidebarCollapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-white/10 p-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center rounded p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          }
        </button>
      </div>
    </aside>
  );
}
