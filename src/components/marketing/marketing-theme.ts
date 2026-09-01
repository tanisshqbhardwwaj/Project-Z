/** Shared marketing surface classes — light + dark theme. */
export const mk = {
  sectionBorder: "border-slate-200 dark:border-slate-800",
  sectionAlt: "bg-[#f6f7fb] dark:bg-slate-950",
  sectionBase: "bg-white dark:bg-slate-900",
  heading: "text-slate-950 dark:text-white",
  body: "text-slate-600 dark:text-slate-300",
  bodyStrong: "text-slate-700 dark:text-slate-200",
  muted: "text-slate-500 dark:text-slate-400",
  link: "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white",
  card: "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  /** Full-width marketing shell: responsive side padding, no narrow 1280px cap. */
  container: "mx-auto w-full px-6 sm:px-8 lg:px-12 xl:px-16 2xl:max-w-[1400px] 2xl:px-24",
  sectionPad: "py-20 lg:py-28",
} as const;
