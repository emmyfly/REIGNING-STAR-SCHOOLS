"use client";

import { ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface EnhancedColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface EnhancedDataTableProps<T extends { id: string }> {
  columns: EnhancedColumn<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  // Selection
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  // Sort (controlled — parent owns state)
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (col: string, dir: "asc" | "desc") => void;
  // Pagination (controlled)
  page?: number;
  pageSize?: number;
  totalRows?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function EnhancedDataTable<T extends { id: string }>({
  columns,
  data,
  isLoading,
  emptyMessage = "No records found.",
  onRowClick,
  className,
  selectable,
  selectedIds = new Set(),
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSortChange,
  page = 1,
  pageSize = 20,
  totalRows = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}: EnhancedDataTableProps<T>) {
  const allSelected = data.length > 0 && data.every((r) => selectedIds.has(r.id));
  const someSelected = data.some((r) => selectedIds.has(r.id)) && !allSelected;

  function toggleAll() {
    if (!onSelectionChange) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      data.forEach((r) => next.delete(r.id));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      data.forEach((r) => next.add(r.id));
      onSelectionChange(next);
    }
  }

  function toggleRow(id: string) {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  }

  function handleSort(key: string) {
    if (!onSortChange) return;
    if (sortColumn === key) {
      onSortChange(key, sortDirection === "asc" ? "desc" : "asc");
    } else {
      onSortChange(key, "asc");
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const from = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalRows);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[calc(100vh-280px)]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 shadow-[0_1px_0_0_var(--border)]">
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10 pr-0">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead key={col.key} className={cn(col.className, col.sortable && "cursor-pointer select-none")}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      sortColumn === col.key ? (
                        sortDirection === "asc"
                          ? <ChevronUp className="h-3 w-3 text-primary" />
                          : <ChevronDown className="h-3 w-3 text-primary" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 text-muted-foreground/50" />
                      )
                    )}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  data-selected={selectedIds.has(row.id) || undefined}
                  className={cn(
                    onRowClick && "cursor-pointer",
                    selectedIds.has(row.id) && "bg-primary/5"
                  )}
                >
                  {selectable && (
                    <TableCell className="w-10 pr-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary cursor-pointer"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination bar */}
      {(onPageChange || onPageSizeChange) && (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => onPageSizeChange?.(Number(v))}
            >
              <SelectTrigger className="h-8 w-20 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span>
              {totalRows === 0
                ? "No results"
                : `${from}–${to} of ${totalRows}`}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline" size="icon"
                className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => onPageChange?.(page - 1)}
              >
                ‹
              </Button>
              <Button
                variant="outline" size="icon"
                className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => onPageChange?.(page + 1)}
              >
                ›
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
