export type FileKind = "pdf" | "md" | "txt" | "other";

export const ACCEPTED_FILES = ".pdf,.md,.txt";

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  pdf: "PDF",
  md: "Markdown",
  txt: "Texto",
  other: "Otro",
};

export function fileKind(source: string): FileKind {
  const ext = source.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "pdf";
  if (ext === "md" || ext === "markdown") return "md";
  if (ext === "txt") return "txt";
  return "other";
}

export function countByKind(sources: string[]): Record<FileKind, number> {
  const counts: Record<FileKind, number> = { pdf: 0, md: 0, txt: 0, other: 0 };
  for (const s of sources) counts[fileKind(s)] += 1;
  return counts;
}
