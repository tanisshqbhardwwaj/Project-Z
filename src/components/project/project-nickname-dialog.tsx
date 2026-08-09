"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { useFetchStore } from "@/stores/fetch-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";

export function ProjectNicknameDialog({
  projectId,
  name,
  nickname,
  canEdit,
}: {
  projectId: string;
  name: string;
  nickname: string | null;
  canEdit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [nick, setNick] = useState(nickname ?? "");
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, applyError } = useFormFeedback();

  if (!canEdit) return null;

  async function save() {
    clear();
    const trimmed = nick.trim();
    if (trimmed.length > 40) {
      showWarning("Nickname must be 40 characters or less");
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/v1/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ nickname: trimmed || null }),
      });
      useFetchStore.getState().invalidatePrefix("projects");
      useFetchStore.getState().invalidatePrefix(`project:${projectId}`);
      setOpen(false);
    } catch (err) {
      applyError(err, "Could not save nickname");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => {
          setNick(nickname ?? "");
          setOpen(true);
        }}
      >
        <Pencil className="mr-1 h-4 w-4" />
        Nickname
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Work order nickname</DialogTitle>
            <DialogDescription>
              Optional short name for lists (e.g. &quot;Block A paint&quot;). Full name: {name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormFeedback warning={warning} error={error} />
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="Short name for easy finding"
                className="h-12 rounded-xl"
                maxLength={40}
              />
            </div>
            <Button className="h-12 w-full rounded-xl" onClick={save} disabled={loading}>
              {loading ? "Saving..." : "Save nickname"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
