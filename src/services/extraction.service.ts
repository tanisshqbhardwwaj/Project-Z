import { prisma } from "@/lib/db/prisma";
import { getDefaultAiModel, getParser } from "@/lib/ai/get-parser";
import { WORK_ORDER_FIELDS } from "@/lib/ai/types";
import { uploadFile, buildStorageKey, getFileBuffer } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { ExtractionQuotaError, isAiQuotaError } from "@/lib/ai/extraction-retry";
import { queueWorkOrderExtraction } from "@/services/extraction-queue.service";
import { createProject } from "./project.service";
import { rupeesToPaise } from "@/lib/finance/money";
import { calculateCompletionDate } from "@/lib/finance/completion-date";

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function uploadAndExtract(input: {
  organizationId: string;
  userId: string;
  file: Buffer;
  fileName: string;
  mimeType: string;
}) {
  const storageKey = buildStorageKey(input.organizationId, "work-orders", input.fileName);

  await uploadFile(storageKey, input.file, input.mimeType, {
    organizationId: input.organizationId,
    category: "document",
  });

  const document = await prisma.document.create({
    data: {
      organizationId: input.organizationId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.file.length,
      storageKey,
      documentType: "WORK_ORDER",
      uploadedById: input.userId,
    },
  });

  const extraction = await prisma.aIExtraction.create({
    data: {
      documentId: document.id,
      provider: process.env.AI_PROVIDER ?? "manual",
      model: getDefaultAiModel(),
      status: "PENDING",
      extractedFields: [],
    },
  });

  await queueWorkOrderExtraction({
    documentId: document.id,
    extractionId: extraction.id,
  });

  return { document, extraction };
}

export async function runWorkOrderExtraction(documentId: string, extractionId: string) {
  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document) return;

    const buffer = await getFileBuffer(document.storageKey);
    const parser = getParser();
    const result = await parser.extract({
      buffer,
      mimeType: document.mimeType,
      fileName: document.fileName,
    });

    await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: {
        status: "COMPLETED",
        extractedFields: result.fields as unknown as object,
        rawResponse: result.rawResponse as object,
        provider: result.provider,
        model: result.model,
        extractedAt: new Date(),
        errorMessage:
          typeof result.rawResponse === "object" &&
          result.rawResponse !== null &&
          "manualFallback" in result.rawResponse
            ? String((result.rawResponse as { message?: string }).message ?? "")
            : null,
      },
    });
  } catch (error) {
    if (error instanceof ExtractionQuotaError) throw error;

    const message = error instanceof Error ? error.message : "Extraction failed";

    if (isAiQuotaError(message)) {
      const { emptyExtractionFields: emptyFields } = await import("@/lib/ai/shared");
      await prisma.aIExtraction.update({
        where: { id: extractionId },
        data: {
          status: "COMPLETED",
          extractedFields: emptyFields() as unknown as object,
          errorMessage:
            "Google AI quota exceeded. Fill in the fields manually below, or wait 1 minute and click Re-run.",
          extractedAt: new Date(),
        },
      });
      throw new ExtractionQuotaError(message);
    }

    await prisma.aIExtraction.update({
      where: { id: extractionId },
      data: {
        status: "PENDING",
        errorMessage: message,
      },
    });
    logger.error("extraction.failed", { documentId, extractionId, message });
    throw error instanceof Error ? error : new Error(message);
  }
}

export async function acceptExtraction(input: {
  extractionId: string;
  organizationId: string;
  userId: string;
  corrections: Record<string, string | number | null>;
}) {
  const extraction = await prisma.aIExtraction.findUnique({
    where: { id: input.extractionId },
    include: { document: true },
  });
  if (!extraction?.document) throw new Error("Extraction not found");

  const fields = extraction.extractedFields as Array<{
    field: string;
    value: string | number | null;
    confidence: number;
    status: string;
  }>;

  const merged: Record<string, string | number | null> = {};
  for (const fieldName of WORK_ORDER_FIELDS) {
    if (input.corrections[fieldName] !== undefined && input.corrections[fieldName] !== "") {
      merged[fieldName] = input.corrections[fieldName];
      continue;
    }
    const fromAi = fields.find((f) => f.field === fieldName);
    if (fromAi?.value != null && fromAi.value !== "") {
      merged[fieldName] = fromAi.value;
    }
  }

  await prisma.aIExtraction.update({
    where: { id: input.extractionId },
    data: {
      status: "REVIEWED",
      userCorrections: merged,
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
  });

  const workOrderDate = parseDate(merged.workOrderDate) ?? new Date();

  const completionDate = calculateCompletionDate({
    workOrderDate,
    documentCompletionDate: parseDate(merged.expectedCompletionDate),
    timeOfCompletion: merged.timeOfCompletion ? String(merged.timeOfCompletion) : null,
    orgDefaultDays: org?.defaultCompletionDays,
  });

  const projectName = merged.projectName
    ? String(merged.projectName)
    : merged.description
      ? String(merged.description).slice(0, 120)
      : "Untitled Project";

  const contractAmount = merged.tenderAmount ?? merged.contractAmount;
  const contractPaise = contractAmount ? rupeesToPaise(Number(contractAmount)) : BigInt(0);

  const project = await createProject({
    organizationId: input.organizationId,
    userId: input.userId,
    name: projectName,
    contractAmountPaise: contractPaise,
    budgetAmountPaise: contractPaise,
    location: merged.projectLocation ? String(merged.projectLocation) : undefined,
    description: merged.description ? String(merged.description) : undefined,
    expectedCompletionDate: completionDate ?? undefined,
    status: "ACTIVE",
    workOrder: {
      workOrderNumber: String(merged.workOrderNumber ?? `WO-${Date.now()}`),
      workOrderDate,
      clientName: String(merged.clientName ?? "Unknown Client"),
      headOfAccount: merged.headOfAccount ? String(merged.headOfAccount) : undefined,
      timeOfCompletion: merged.timeOfCompletion ? String(merged.timeOfCompletion) : undefined,
      paymentTerms: merged.paymentTerms ? String(merged.paymentTerms) : undefined,
    },
  });

  await prisma.document.update({
    where: { id: extraction.document.id },
    data: { projectId: project.id, workOrderId: (await prisma.workOrder.findUnique({ where: { projectId: project.id } }))?.id },
  });

  return project;
}

export async function rerunExtraction(extractionId: string) {
  const extraction = await prisma.aIExtraction.findUnique({
    where: { id: extractionId },
    include: { document: true },
  });
  if (!extraction) throw new Error("Not found");

  await prisma.aIExtraction.update({
    where: { id: extractionId },
    data: { status: "PENDING", errorMessage: null },
  });

  await queueWorkOrderExtraction({
    documentId: extraction.documentId,
    extractionId,
  });
  return extraction;
}
