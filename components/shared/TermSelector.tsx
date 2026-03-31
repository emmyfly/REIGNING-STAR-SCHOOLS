"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettingsStore } from "@/stores/settingsStore";
import { Term } from "@/types";

const TERMS: Term[] = ["First", "Second", "Third"];

interface TermSelectorProps {
  value?: Term;
  onChange?: (term: Term) => void;
}

export function TermSelector({ value, onChange }: TermSelectorProps) {
  const { currentTerm, setCurrentTerm } = useSettingsStore();

  const selected = value ?? currentTerm;
  const handleChange = (v: string) => {
    const term = v as Term;
    onChange ? onChange(term) : setCurrentTerm(term);
  };

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Select term" />
      </SelectTrigger>
      <SelectContent>
        {TERMS.map((t) => (
          <SelectItem key={t} value={t}>{t} Term</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
