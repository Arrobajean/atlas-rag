import { FileCodeIcon, FileIcon, FileTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FILE_KIND_LABELS, fileKind, type FileKind } from "@/lib/file-kind";

const KIND_STYLE: Record<FileKind, { icon: typeof FileIcon; iconClass: string; badgeClass: string }> = {
  pdf: { icon: FileIcon, iconClass: "text-red-500", badgeClass: "text-red-600 bg-red-500/10 border-red-500/20" },
  md: { icon: FileCodeIcon, iconClass: "text-sky-500", badgeClass: "text-sky-600 bg-sky-500/10 border-sky-500/20" },
  txt: { icon: FileTextIcon, iconClass: "text-muted-foreground", badgeClass: "text-muted-foreground bg-muted" },
  other: { icon: FileTextIcon, iconClass: "text-muted-foreground", badgeClass: "text-muted-foreground bg-muted" },
};

export function FileKindIcon({ source, className }: { source: string; className?: string }) {
  const { icon: Icon, iconClass } = KIND_STYLE[fileKind(source)];
  return <Icon className={cn("size-4 shrink-0", iconClass, className)} />;
}

export function FileKindBadge({ source }: { source: string }) {
  const kind = fileKind(source);
  return (
    <Badge variant="outline" className={cn("text-[10px] font-medium", KIND_STYLE[kind].badgeClass)}>
      {FILE_KIND_LABELS[kind]}
    </Badge>
  );
}
