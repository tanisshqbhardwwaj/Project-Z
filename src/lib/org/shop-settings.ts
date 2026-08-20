export type ShopOrgSettings = {
  brandName?: string;
  logoUrl?: string | null;
};

export type ShopLabelBranding = {
  shopName: string;
  brandName: string;
  logoUrl: string | null;
};

export type LabelSize = "small" | "full";

/** What to show at the top of full-size tags */
export type FullLabelHeaderMode = "both" | "name" | "logo";

export function parseShopOrgSettings(settings: unknown): ShopOrgSettings {
  if (!settings || typeof settings !== "object") return {};
  const root = settings as Record<string, unknown>;
  const shop = root.shop;
  if (!shop || typeof shop !== "object") return {};
  const s = shop as Record<string, unknown>;
  return {
    brandName: typeof s.brandName === "string" ? s.brandName : undefined,
    logoUrl: typeof s.logoUrl === "string" ? s.logoUrl : null,
  };
}

export function resolveShopLabelBranding(
  shopName: string,
  settings: unknown
): ShopLabelBranding {
  const shop = parseShopOrgSettings(settings);
  return {
    shopName,
    brandName: shop.brandName?.trim() || shopName,
    logoUrl: shop.logoUrl?.trim() || null,
  };
}

export function mergeShopOrgSettings(
  existingSettings: Record<string, unknown>,
  shopPatch: ShopOrgSettings
): Record<string, unknown> {
  const prevShop = parseShopOrgSettings(existingSettings);
  const nextShop: ShopOrgSettings = { ...prevShop };

  if (shopPatch.brandName !== undefined) {
    nextShop.brandName = shopPatch.brandName.trim() || undefined;
  }
  if (shopPatch.logoUrl !== undefined) {
    nextShop.logoUrl = shopPatch.logoUrl?.trim() || null;
  }

  return {
    ...existingSettings,
    shop: nextShop,
  };
}
