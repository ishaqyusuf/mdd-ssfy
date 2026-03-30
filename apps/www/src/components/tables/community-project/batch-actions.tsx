"use client";

import { updateProjectArchivedAction } from "@/actions/community/project-actions";
import { Button } from "@gnd/ui/button";
import { BatchAction } from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { Archive, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ItemType } from "./columns";

function BatchArchiveButton({
  projectIds,
  archived,
  label,
  icon: Icon,
}: {
  projectIds: number[];
  archived: boolean;
  label: string;
  icon: any;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="rounded-none"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await updateProjectArchivedAction({
            projectIds,
            archived,
          });
          router.refresh();
        });
      }}
    >
      <Icon className="mr-2 size-4" />
      {label}
    </Button>
  );
}

export function BatchActions() {
  const ctx = useTable();
  const selectedRows = ctx.selectedRows ?? [];
  if (!selectedRows.length) return null;

  const selectedProjects = selectedRows
    .map((row) => row.original as ItemType)
    .filter(Boolean);
  const projectIds = selectedProjects.map((project) => project.id);

  return (
    <BatchAction>
      <BatchArchiveButton
        projectIds={projectIds}
        archived={false}
        label="Mark active"
        icon={CheckCheck}
      />
      <BatchArchiveButton
        projectIds={projectIds}
        archived={true}
        label="Archive"
        icon={Archive}
      />
    </BatchAction>
  );
}
