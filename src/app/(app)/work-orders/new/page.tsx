"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO, isValid } from "date-fns";
import {
  Camera,
  Eye,
  FileText,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker, ReadOnlyDatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  calculateCompletionDate,
  formatDateISO,
} from "@/lib/finance/completion-date";
import { FormFeedback } from "@/components/ui/form-feedback";
import { useFormFeedback } from "@/hooks/use-form-feedback";
import { firstValidationIssue, requireField } from "@/lib/api/validation";

const FIELD_LABELS: Record<string, string> = {
  workOrderNumber: "Work Order Number",
  workOrderDate: "Work Order Date",
  timeOfCompletion: "Time of Completion",
  expectedCompletionDate: "Expected Completion Date",
  clientName: "Client Name",
  headOfAccount: "Head of Account",
  projectName: "Project Name",
  projectLocation: "Project Location",
  description: "Description",
  contractAmount: "Tender Amount (₹) — final",
  tenderAmount: "Tender Amount (₹) — final",
  paymentTerms: "Payment Terms",
};

const TEXT_FIELDS = [
  "workOrderNumber",
  "timeOfCompletion",
  "clientName",
  "headOfAccount",
  "projectName",
  "projectLocation",
  "description",
  "tenderAmount",
  "paymentTerms",
];

const DEFAULT_FIELDS = Object.keys(FIELD_LABELS);

const WORK_ORDER_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,image/*";

const CAMERA_ACCEPT =
  "image/*,.heic,.heif,image/heic,image/heif";

type ExtractedField = {
  field: string;
  value: unknown;
  confidence: number;
  status: string;
};

function fieldValue(
  field: string,
  corrections: Record<string, string>,
  extracted: ExtractedField[]
): string {
  if (corrections[field] !== undefined) return corrections[field];
  const fromAi = extracted.find((f) => f.field === field);
  return fromAi?.value != null ? String(fromAi.value) : "";
}

export default function NewWorkOrderPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileSource, setFileSource] = useState<"file" | "camera" | null>(null);
  const [extractionId, setExtractionId] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<{
    status: string;
    extractedFields: ExtractedField[];
    errorMessage?: string | null;
  } | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { warning, error, clear, showWarning, showError, applyResponseError } = useFormFeedback();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState("");

  const fieldsToShow = useMemo(() => {
    if (extraction && extraction.extractedFields.length > 0) {
      const existing = new Set(extraction.extractedFields.map((f) => f.field));
      const merged = [...extraction.extractedFields];
      for (const field of DEFAULT_FIELDS) {
        if (!existing.has(field)) {
          merged.push({ field, value: null, confidence: 0, status: "pending" });
        }
      }
      return merged.filter((f) => FIELD_LABELS[f.field]);
    }
    return DEFAULT_FIELDS.map((field) => ({
      field,
      value: null,
      confidence: 0,
      status: "pending",
    }));
  }, [extraction]);

  const computedCompletionDate = useMemo(() => {
    const woDateStr = fieldValue("workOrderDate", corrections, fieldsToShow);
    const timeOfCompletion = fieldValue("timeOfCompletion", corrections, fieldsToShow);
    const explicitDate = fieldValue("expectedCompletionDate", corrections, fieldsToShow);

    if (!woDateStr) return "";

    const woDate = parseISO(woDateStr);
    if (!isValid(woDate)) return explicitDate;

    if (explicitDate && !timeOfCompletion) return explicitDate;

    const computed = calculateCompletionDate({
      workOrderDate: woDate,
      documentCompletionDate: explicitDate ? parseISO(explicitDate) : null,
      timeOfCompletion: timeOfCompletion || null,
    });

    return computed ? formatDateISO(computed) : explicitDate;
  }, [corrections, fieldsToShow]);

  const setField = useCallback((field: string, value: string) => {
    setCorrections((prev) => ({ ...prev, [field]: value }));
  }, []);

  const selectFile = useCallback(
    (selected: File | null, source: "file" | "camera") => {
      if (!selected) return;
      setFile(selected);
      setFileSource(source);
      clear();
    },
    [clear]
  );

  function resetUpload() {
    setExtraction(null);
    setExtractionId(null);
    setFile(null);
    setFileSource(null);
    setCorrections({});
    clear();
  }

  async function upload() {
    clear();
    if (!file) {
      showWarning("Please select a file to upload");
      return;
    }
    setLoading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("/api/v1/work-orders/upload", { method: "POST", body: fd });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        applyResponseError(data, "Upload failed. Is MinIO running?");
        return;
      }

      setExtractionId(data.data.extraction.id);
      setExtraction({ status: "PENDING", extractedFields: [] });
      pollExtraction(data.data.extraction.id);
    } catch {
      setLoading(false);
      showError("Network error — could not reach the server.");
    }
  }

  async function pollExtraction(id: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/work-orders/${id}/extraction`);
        const data = await res.json();
        if (!res.ok || !data.data) {
          clearInterval(interval);
          applyResponseError(data, "Failed to load extraction status");
          return;
        }
        setExtraction(data.data);
        if (data.data.status === "COMPLETED" || data.data.status === "FAILED") {
          clearInterval(interval);
          if (data.data.errorMessage) showWarning(data.data.errorMessage);
          if (data.data.status === "FAILED") {
            showError(data.data.errorMessage ?? "AI extraction failed");
          }
        }
      } catch {
        clearInterval(interval);
        showError("Lost connection while extracting.");
      }
    }, 2000);
  }

  async function openPreview() {
    if (!extractionId) return;
    const res = await fetch(`/api/v1/work-orders/${extractionId}/preview`);
    const data = await res.json();
    if (res.ok) {
      setPreviewUrl(data.data.url);
      setPreviewMime(data.data.mimeType);
      setPreviewOpen(true);
    }
  }

  async function rerun() {
    if (!extractionId) return;
    setLoading(true);
    clear();
    await fetch(`/api/v1/work-orders/${extractionId}/extraction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rerun" }),
    });
    setExtraction({ status: "PENDING", extractedFields: [] });
    setLoading(false);
    pollExtraction(extractionId);
  }

  async function accept() {
    if (!extractionId) return;
    clear();

    const validationMessage = firstValidationIssue([
      requireField(fieldValue("projectName", corrections, extraction?.extractedFields ?? []), "project name"),
      requireField(fieldValue("workOrderNumber", corrections, extraction?.extractedFields ?? []), "work order number"),
      requireField(fieldValue("clientName", corrections, extraction?.extractedFields ?? []), "client name"),
    ]);
    if (validationMessage) {
      showWarning(validationMessage);
      return;
    }

    setLoading(true);

    const payload = { ...corrections };
    if (computedCompletionDate) {
      payload.expectedCompletionDate = computedCompletionDate;
    }

    const res = await fetch(`/api/v1/work-orders/${extractionId}/extraction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corrections: payload }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      router.push(`/projects/${data.data.id}`);
    } else {
      applyResponseError(data, "Failed to create project");
    }
  }

  const showReview =
    extraction?.status === "COMPLETED" || extraction?.status === "FAILED";

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      <div className="space-y-1">
        <p className="text-sm font-medium text-primary">Work Order</p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Upload & Review</h1>
        <p className="text-sm text-muted-foreground">
          Upload a PDF or photo, or take a picture with your phone camera. iPhone HEIC photos are supported.
        </p>
      </div>

      <FormFeedback warning={warning} error={error} className="rounded-xl" />

      {!extraction ? (
        <Card className="rounded-2xl border-0 shadow-md">
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-8 transition-colors hover:bg-primary/10"
              >
                <Upload className="mb-3 h-9 w-9 text-primary" />
                <span className="text-base font-medium">Choose file</span>
                <span className="mt-1 text-center text-sm text-muted-foreground">
                  PDF, JPG, PNG, HEIC
                </span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 py-8 transition-colors hover:bg-primary/10"
              >
                <Camera className="mb-3 h-9 w-9 text-primary" />
                <span className="text-base font-medium">Take photo</span>
                <span className="mt-1 text-center text-sm text-muted-foreground">
                  Opens camera on iPhone
                </span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={WORK_ORDER_ACCEPT}
              className="hidden"
              onChange={(e) => {
                selectFile(e.target.files?.[0] ?? null, "file");
                e.target.value = "";
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept={CAMERA_ACCEPT}
              capture="environment"
              className="hidden"
              onChange={(e) => {
                selectFile(e.target.files?.[0] ?? null, "camera");
                e.target.value = "";
              }}
            />

            {file && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-3">
                {fileSource === "camera" ? (
                  <Camera className="h-5 w-5 text-primary" />
                ) : (
                  <FileText className="h-5 w-5 text-primary" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                    {fileSource === "camera" ? " · Camera photo" : ""}
                    {/\.heic$|\.heif$/i.test(file.name) ? " · HEIC (converted on upload)" : ""}
                  </p>
                </div>
              </div>
            )}
            <Button
              onClick={upload}
              disabled={!file || loading}
              size="lg"
              className="h-12 w-full rounded-xl text-base"
              type="button"
            >
              {loading ? "Uploading..." : "Upload & Extract"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg">
                Review ({extraction.status.toLowerCase()})
              </CardTitle>
              {extractionId && showReview && (
                <Button variant="outline" size="sm" onClick={openPreview} className="rounded-lg">
                  <Eye className="mr-1 h-4 w-4" />
                  Preview
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {extraction.status === "PENDING" && (
                <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Extracting data from document...</p>
                </div>
              )}

              {showReview &&
                fieldsToShow.map((f) => {
                  const label = FIELD_LABELS[f.field] ?? f.field;
                  const value = fieldValue(f.field, corrections, fieldsToShow);

                  if (f.field === "workOrderDate") {
                    return (
                      <div key={f.field} className="space-y-2">
                        <Label>{label}</Label>
                        <DatePicker
                          value={value}
                          onChange={(d) => setField(f.field, d)}
                          placeholder="Select work order date"
                        />
                        {f.confidence > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {Math.round(f.confidence * 100)}% confidence
                          </p>
                        )}
                      </div>
                    );
                  }

                  if (f.field === "expectedCompletionDate") {
                    return (
                      <div key={f.field} className="space-y-2">
                        <Label>{label}</Label>
                        <ReadOnlyDatePicker
                          value={computedCompletionDate}
                          label={
                            fieldValue("timeOfCompletion", corrections, fieldsToShow)
                              ? `Calculated from: ${fieldValue("timeOfCompletion", corrections, fieldsToShow)}`
                              : "Auto-calculated"
                          }
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={f.field} className="space-y-2">
                      <Label>{label}</Label>
                      <Input
                        value={value}
                        onChange={(e) => setField(f.field, e.target.value)}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        className="h-12 rounded-xl"
                      />
                      {f.field === "tenderAmount" && (
                        <p className="text-xs text-muted-foreground">
                          This is the final tender amount — the only revenue for this work order.
                        </p>
                      )}
                      {f.confidence > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {Math.round(f.confidence * 100)}% confidence
                        </p>
                      ) : TEXT_FIELDS.includes(f.field) ? (
                        <p className="text-xs text-muted-foreground">Manual entry</p>
                      ) : null}
                    </div>
                  );
                })}

              {showReview && (
                <div className="sticky bottom-20 z-10 -mx-1 flex flex-col gap-2 rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur md:bottom-0 md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
                  <Button onClick={accept} size="lg" disabled={loading} className="h-12 rounded-xl">
                    Create Project
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={rerun} disabled={loading} className="rounded-xl">
                      Re-run AI
                    </Button>
                    <Button
                      variant="outline"
                      onClick={resetUpload}
                      className="rounded-xl"
                    >
                      New upload
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {showReview && (
            <p className="rounded-xl bg-muted/60 p-4 text-sm text-muted-foreground">
              After creating the project, click <strong>Partners</strong> on that work order to
              invite partners by email, link, or WhatsApp — scoped to this work only.
            </p>
          )}
        </>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Work Order Preview</DialogTitle>
            <DialogDescription>Original uploaded document</DialogDescription>
          </DialogHeader>
          <div className="max-h-[75vh] overflow-auto p-4 pt-2">
            {previewUrl && previewMime.startsWith("image/") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Work order preview" className="mx-auto max-w-full rounded-lg" />
            )}
            {previewUrl && previewMime === "application/pdf" && (
              <iframe src={previewUrl} title="Work order PDF" className="h-[70vh] w-full rounded-lg" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
