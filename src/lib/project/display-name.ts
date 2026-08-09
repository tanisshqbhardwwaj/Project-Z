/** Short label for lists; falls back to full project name. */
export function getProjectDisplayName(project: {
  nickname?: string | null;
  name: string;
}): string {
  const nick = project.nickname?.trim();
  return nick || project.name;
}

/** Clamp long official project names to 2 lines in lists and headers. */
export const PROJECT_LONG_NAME_CLASS = "line-clamp-2 break-words leading-snug";

const COMPLETED_STATUSES = new Set(["COMPLETED", "CANCELLED", "ARCHIVED"]);

export function isActiveProjectStatus(status: string): boolean {
  return !COMPLETED_STATUSES.has(status);
}

export function projectStatusLabel(status: string): "Active" | "Completed" {
  return status === "COMPLETED" ? "Completed" : "Active";
}
export function getProjectSubtitle(project: {
  nickname?: string | null;
  name: string;
}): string | null {
  const nick = project.nickname?.trim();
  if (!nick || nick === project.name) return null;
  return project.name;
}
