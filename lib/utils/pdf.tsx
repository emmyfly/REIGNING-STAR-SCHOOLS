// PDF utilities — @react-pdf/renderer implementation is in lib/pdf/ReportCardDocument.tsx
// This file exports the shared data type and download helper.
import { ReportCardData } from "@/types";

export type { ReportCardData };

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
