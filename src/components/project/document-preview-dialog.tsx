"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function DocumentPreviewDialog({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    url: string;
    mimeType: string;
    fileName: string;
  } | null>(null);
  const [error, setError] = useState("");

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<{ url: string; mimeType: string; fileName: string }>(
        `/api/v1/documents/${documentId}/preview`
      );
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load preview");
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPreview(null);
      setError("");
    }
  }

  const isImage = preview?.mimeType.startsWith("image/");
  const isPdf = preview?.mimeType === "application/pdf";

  return (
    <>
      <Button variant="outline" size="sm" className="rounded-lg" onClick={openPreview}>
        <Eye className="mr-1 h-4 w-4" />
        Preview
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="truncate pr-8">{preview?.fileName ?? fileName}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[calc(90vh-5rem)] overflow-auto bg-muted/30 p-4">
            {loading && <p className="text-sm text-muted-foreground">Loading preview...</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {preview && isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.url}
                alt={preview.fileName}
                className="mx-auto max-h-[70vh] rounded-lg object-contain"
              />
            )}
            {preview && isPdf && (
              <iframe
                src={preview.url}
                title={preview.fileName}
                className="h-[70vh] w-full rounded-lg border bg-white"
              />
            )}
            {preview && !isImage && !isPdf && (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">
                  Preview not available for this file type. Download to view.
                </p>
                <Button asChild className="rounded-xl">
                  <a href={preview.url} target="_blank" rel="noopener noreferrer">
                    Open file
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
