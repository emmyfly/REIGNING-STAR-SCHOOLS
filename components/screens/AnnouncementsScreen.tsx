"use client";

import { useState } from "react";
import { Plus, Trash2, Pin, RefreshCw, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useClasses } from "@/hooks/useStudents";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { formatDate } from "@/lib/utils/formatting";
import { Announcement } from "@/types";

// ─── Create dialog ────────────────────────────────────────────────────────────
function CreateAnnouncementDialog({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [classId, setClassId] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  const { data: classes = [] } = useClasses();
  const createMutation = useCreateAnnouncement();

  const handleSave = async () => {
    await createMutation.mutateAsync({
      title,
      body,
      class_id: classId || undefined,
      audience: classId ? "specific_class" : "all",
      is_pinned: isPinned,
      published_at: new Date().toISOString(),
    });
    onClose();
  };

  const canSave = !!title.trim() && !!body.trim();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Announcement</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title…"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Body *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your announcement here…"
              rows={5}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Target Class (leave blank for school-wide)</label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="All students (school-wide)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">School-wide</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Pin this announcement</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createMutation.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave || createMutation.isPending}>
            {createMutation.isPending && <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Announcement card ────────────────────────────────────────────────────────
function AnnouncementCard({
  announcement,
  onDelete,
}: {
  announcement: Announcement;
  onDelete: () => void;
}) {
  const cls = announcement.class as unknown as { name: string } | undefined;
  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {announcement.is_pinned && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Pin className="h-3 w-3" /> Pinned
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {cls ? cls.name : "School-wide"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(announcement.published_at ?? announcement.created_at)}
              </span>
            </div>
            <p className="font-semibold truncate">{announcement.title}</p>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{announcement.body}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function AnnouncementsScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const { data: announcements = [], isLoading } = useAnnouncements();
  const deleteMutation = useDeleteAnnouncement();

  // Pinned first, then newest first
  const sorted = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return  1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Megaphone className="h-8 w-8 opacity-30" />
          <p className="text-sm">No announcements yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              onDelete={() => setDeleteTarget(a)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAnnouncementDialog onClose={() => setShowCreate(false)} />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Announcement"
        description={`Remove "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
