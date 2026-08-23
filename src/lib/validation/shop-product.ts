import { z } from "zod";

const attributesSchema = z.record(z.string(), z.string().max(120)).optional();

export const productVariantSchema = z.object({
  size: z.string().max(40).optional().nullable(),
  color: z.string().max(40).optional().nullable(),
  variantLabel: z.string().max(80).optional().nullable(),
  barcode: z.string().max(64).optional().nullable(),
  sku: z.string().max(64).optional().nullable(),
  quantity: z.number().min(0).max(1_000_000).optional(),
  reorderLevel: z.number().min(0).max(1_000_000).optional(),
  sellRupees: z.number().min(0).max(100_000_000).optional().nullable(),
  costRupees: z.number().min(0).max(100_000_000).optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  supplierName: z.string().max(120).optional().nullable(),
  batchNo: z.string().max(60).optional().nullable(),
  attributes: attributesSchema,
});

export const createProductSchema = z
  .object({
    name: z.string().min(1).max(160),
    description: z.string().max(1000).optional().nullable(),
    brand: z.string().max(80).optional().nullable(),
    categoryKey: z.string().max(80).optional().nullable(),
    subCategoryKey: z.string().max(80).optional().nullable(),
    unit: z.string().max(20).optional().nullable(),
    hasVariants: z.boolean(),
    variantAxis: z.string().max(40).optional().nullable(),
    supplierName: z.string().max(120).optional().nullable(),
    batchNo: z.string().max(60).optional().nullable(),
    attributes: attributesSchema,
    notes: z.string().max(1000).optional().nullable(),
    defaultSellRupees: z.number().min(0).max(100_000_000).optional().nullable(),
    defaultCostRupees: z.number().min(0).max(100_000_000).optional().nullable(),
    defaultReorderLevel: z.number().min(0).max(1_000_000).optional(),
    variants: z.array(productVariantSchema).max(60),
    autoBarcode: z.boolean().optional(),
    autoSku: z.boolean().optional(),
    /**
     * Product names are intentionally not unique. The client sets this after the
     * user confirms the "a similar product already exists" prompt.
     */
    confirmDuplicate: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.hasVariants && data.variants.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Add at least one size or variant",
      });
    }
  });

export const updateProductSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional().nullable(),
  brand: z.string().max(80).optional().nullable(),
  categoryKey: z.string().max(80).optional().nullable(),
  subCategoryKey: z.string().max(80).optional().nullable(),
  unit: z.string().max(20).optional().nullable(),
  supplierName: z.string().max(120).optional().nullable(),
  batchNo: z.string().max(60).optional().nullable(),
  attributes: attributesSchema,
  notes: z.string().max(1000).optional().nullable(),
  variantAxis: z.string().max(40).optional().nullable(),
});

export const addVariantsSchema = z.object({
  variants: z.array(productVariantSchema).min(1).max(60),
  autoBarcode: z.boolean().optional(),
  autoSku: z.boolean().optional(),
});

export type CreateProductBody = z.infer<typeof createProductSchema>;
export type ProductVariantBody = z.infer<typeof productVariantSchema>;
