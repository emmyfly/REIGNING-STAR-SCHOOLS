"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
  emoji: string;
  badge?: number;        // live count — red pill
  roles: string[];       // which roles can see this item
}

interface SidebarNavItemProps extends NavItem {
  collapsed: boolean;
}

export function SidebarNavItem({
  href,
  label,
  emoji,
  badge,
  collapsed,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        // Base
        "relative flex items-center gap-3 py-2 text-[14px] font-medium text-white/80 transition-colors select-none",
        "border-l-[3px]",
        collapsed ? "justify-center px-3" : "px-4",
        // Active state: gold border + subtle gold wash
        isActive
          ? "border-[#F5A623] bg-[#F5A623]/[0.15] text-white"
          : "border-transparent hover:bg-white/[0.08] hover:text-white"
      )}
    >
      {/* Emoji icon */}
      <span className="shrink-0 text-base leading-none" aria-hidden>
        {emoji}
      </span>

      {/* Label */}
      {!collapsed && <span className="flex-1 truncate">{label}</span>}

      {/* Badge */}
      {!collapsed && badge != null && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-semibold text-white leading-none">
          {badge > 99 ? "99+" : badge}
        </span>
      )}

      {/* Collapsed badge dot */}
      {collapsed && badge != null && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
      )}
    </Link>
  );
}
