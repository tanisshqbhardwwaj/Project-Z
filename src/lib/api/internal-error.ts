export function clientSafeInternalMessage(
  error: unknown,
  isProduction: boolean
): string {
  if (error instanceof Error && error.name === "NoSuchBucket") {
    return isProduction
      ? "File storage is not available. Try again later."
      : "Storage bucket missing. Run: docker compose up -d";
  }
  if (error instanceof Error && error.name === "AccessDenied") {
    return isProduction
      ? "File storage denied this request. Try again later."
      : "Storage access denied. Check R2 API token has Object Read & Write on the correct bucket.";
  }
  if (!isProduction && error instanceof Error && error.message) {
    return error.message;
  }
  return "An unexpected error occurred";
}
