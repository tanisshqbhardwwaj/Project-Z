/** Short label for lists; falls back to full project name. */
export function getProjectDisplayName(project: {
  nickname?: string | null;
  name: string;
}): string {
  const nick = project.nickname?.trim();
  return nick || project.name;
}

/** Clamp long official project names to 3 lines in lists and headers. */
export const PROJECT_LONG_NAME_CLASS =
  "line-clamp-3 break-words leading-snug";
export function getProjectSubtitle(project: {
  nickname?: string | null;
  name: string;
}): string | null {
  const nick = project.nickname?.trim();
  if (!nick || nick === project.name) return null;
  return project.name;
}
