"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, ClipboardList, FileText, BookOpen,
  Send, Trophy, HelpCircle, FlaskConical, Banknote, CreditCard,
  BarChart3, MessageSquare, Megaphone, Settings,
} from "lucide-react";

const PAGES = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/students",      label: "Students",        icon: Users },
  { href: "/scores",        label: "Score Upload",    icon: ClipboardList },
  { href: "/report-cards",  label: "Report Cards",    icon: FileText },
  { href: "/assignments",   label: "Assignments",     icon: BookOpen },
  { href: "/submissions",   label: "Submissions",     icon: Send },
  { href: "/leaderboard",   label: "Leaderboard",     icon: Trophy },
  { href: "/question-bank", label: "Question Bank",   icon: HelpCircle },
  { href: "/exam-builder",  label: "Exam Builder",    icon: FlaskConical },
  { href: "/fees",          label: "Fee Structure",   icon: Banknote },
  { href: "/payments",      label: "Payments",        icon: CreditCard },
  { href: "/revenue",       label: "Revenue Reports", icon: BarChart3 },
  { href: "/complaints",    label: "Complaints",      icon: MessageSquare },
  { href: "/announcements", label: "Announcements",   icon: Megaphone },
  { href: "/settings",      label: "Settings",        icon: Settings },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function navigate(href: string) {
    router.push(href);
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Go to page, search students…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {PAGES.map(({ href, label, icon: Icon }) => (
            <CommandItem key={href} onSelect={() => navigate(href)}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </CommandDialog>
  );
}
