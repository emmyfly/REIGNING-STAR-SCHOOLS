"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";

// Generate recent sessions relative to current year
function generateSessions(count = 5): string[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: count }, (_, i) => {
    const start = currentYear - i;
    return `${start}/${start + 1}`;
  });
}

interface SessionSelectorProps {
  value?: string;
  onChange?: (session: string) => void;
}

export function SessionSelector({ value, onChange }: SessionSelectorProps) {
  const { currentSession, setCurrentSession } = useSettingsStore();
  const sessions = generateSessions();

  const selected = value ?? currentSession;
  const handleChange = (v: string) => {
    onChange ? onChange(v) : setCurrentSession(v);
  };

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Select session" />
      </SelectTrigger>
      <SelectContent>
        {sessions.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
