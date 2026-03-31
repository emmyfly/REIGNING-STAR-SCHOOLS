"use client";

import { Bell, Search, LogOut, User } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import { useSettings } from "@/hooks/useSettings";
import { getInitials } from "@/lib/utils/formatting";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  title: string;
}

export function TopBar({ title }: TopBarProps) {
  const { user, signOut } = useAdmin();
  const { currentTerm, currentSession } = useSettings();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 gap-4">
      {/* Page title */}
      <h1 className="text-base font-semibold truncate">{title}</h1>

      <div className="flex items-center gap-2 ml-auto">
        {/* Term/Session badge */}
        <span className="hidden sm:inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {currentTerm} Term &mdash; {currentSession}
        </span>

        {/* Search trigger */}
        <Button variant="ghost" size="icon" className="text-muted-foreground" title="Search (⌘K)">
          <Search className="h-4 w-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-muted-foreground" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </Button>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            {user ? getInitials(user.full_name) : <User className="h-4 w-4" />}
          </div>
          {user && (
            <div className="hidden md:block">
              <p className="text-xs font-medium leading-none">{user.full_name}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{user.role.replace("_", " ")}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            title="Sign out"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
