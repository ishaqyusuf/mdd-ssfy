"use client";

import { cn } from "../../utils";
import { Icons } from "../icons";

type Props = {
  mimetype?: string | null;
  className?: string;
};

export function FilePreviewIcon({ mimetype, className }: Props) {
  switch (mimetype) {
    case "application/pdf":
      return <Icons.Pdf className={cn("w-full h-full", className)} />;
    case "application/zip":
      return <Icons.FolderZip className={cn("w-full h-full", className)} />;
    default:
      return <Icons.Description className={cn("w-full h-full", className)} />;
  }
}
