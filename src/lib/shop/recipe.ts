import type { ShopItemKind } from "@/lib/shop/sector-mode";

export type RecipeIngredient = {
  inventoryItemId: string;
  qtyPerServe: number;
  /** Denormalized for forms and audit logs. */
  name?: string;
};

const RECIPE_JSON_KEY = "recipeJson";

export function parseRecipeFromAttributes(
  attributes: unknown
): RecipeIngredient[] {
  if (!attributes || typeof attributes !== "object") return [];
  const raw = (attributes as Record<string, unknown>)[RECIPE_JSON_KEY];
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === "object")
      .map((row) => {
        const o = row as Record<string, unknown>;
        const inventoryItemId =
          typeof o.inventoryItemId === "string" ? o.inventoryItemId : "";
        const qtyPerServe = Number(o.qtyPerServe ?? 0);
        const name = typeof o.name === "string" ? o.name : undefined;
        return { inventoryItemId, qtyPerServe, name };
      })
      .filter((r) => r.inventoryItemId && r.qtyPerServe > 0);
  } catch {
    return [];
  }
}

export function serializeRecipeToAttributes(
  recipe: RecipeIngredient[],
  existing: Record<string, string> = {}
): Record<string, string> {
  const next = { ...existing };
  if (recipe.length === 0) {
    delete next[RECIPE_JSON_KEY];
    return next;
  }
  next[RECIPE_JSON_KEY] = JSON.stringify(
    recipe.map((r) => ({
      inventoryItemId: r.inventoryItemId,
      qtyPerServe: r.qtyPerServe,
      ...(r.name ? { name: r.name } : {}),
    }))
  );
  return next;
}

/** Aggregate ingredient deductions for menu items sold on a bill. */
export function aggregateRecipeDeductions(
  lines: Array<{
    qty: number;
    productId?: string | null;
    itemKind?: ShopItemKind | null;
  }>,
  recipesByProductId: Map<string, RecipeIngredient[]>
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    const recipe = recipesByProductId.get(line.productId);
    if (!recipe?.length) continue;
    if (line.itemKind && line.itemKind !== "MENU_ITEM") continue;
    for (const ing of recipe) {
      const add = ing.qtyPerServe * line.qty;
      totals.set(ing.inventoryItemId, (totals.get(ing.inventoryItemId) ?? 0) + add);
    }
  }
  return totals;
}
