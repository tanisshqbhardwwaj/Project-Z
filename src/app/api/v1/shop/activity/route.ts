import {
  getAuthContext,
  handleApi,
  requirePermission,
  apiSuccess,
} from "@/lib/api/context";
import {
  ACTIVITY_MODULE_FILTERS,
  getShopActivityActors,
  getShopActivityLogs,
  type ActivityDatePreset,
  type ActivityModuleFilter,
} from "@/services/shop-activity.service";

export async function GET(request: Request) {
  return handleApi(async () => {
    const ctx = await getAuthContext(request.headers.get("X-Organization-Id"));
    requirePermission(ctx, "shop.activity.view");
    const { searchParams } = new URL(request.url);

    if (searchParams.get("actors") === "1") {
      const actors = await getShopActivityActors(ctx.organizationId);
      return apiSuccess(actors);
    }

    const moduleParam = searchParams.get("module") ?? "all";
    const module = ACTIVITY_MODULE_FILTERS.includes(moduleParam as ActivityModuleFilter)
      ? (moduleParam as ActivityModuleFilter)
      : "all";

    const datePreset = (searchParams.get("date") ?? "all") as ActivityDatePreset;

    const logs = await getShopActivityLogs({
      organizationId: ctx.organizationId,
      search: searchParams.get("q") ?? undefined,
      module,
      datePreset,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      limit: Number(searchParams.get("limit") ?? 50),
      cursor: searchParams.get("cursor") ?? undefined,
    });
    return apiSuccess(logs);
  });
}
