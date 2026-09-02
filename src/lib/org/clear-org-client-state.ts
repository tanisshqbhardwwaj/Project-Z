import { setActiveBranchId } from "@/lib/api/client";
import { clearNativeDisplayCache } from "@/lib/auth/native-session-cache";

/** Clears org-scoped client storage before org switch or logout. */
export function clearOrgClientState(): void {
  setActiveBranchId(null);
  clearNativeDisplayCache();
}
