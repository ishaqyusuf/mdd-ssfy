"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
  BatchAction,
  BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useTable } from "@gnd/ui/data-table";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Item } from "./columns";

export function BatchActions() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const ctx = useTable();
  const selectedRows = ctx.selectedRows ?? [];
  if (!selectedRows.length) return null;

  const items = selectedRows.map((row) => row.original as Item);
  const unitIds = items.map((item) => item.id);
  const firstSlug = items[0]?.slug;

  const deleteMutation = useMutation(
    trpc.community.deleteUnits.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.community.getProjectUnits.pathKey(),
        });
      },
    }),
  );

  return (
    <BatchAction>
      <Button
        variant="ghost"
        className="rounded-none"
        disabled={!firstSlug}
        onClick={() => {
          if (!firstSlug) return;
          router.push(`/community/project-units/${firstSlug}`);
        }}
      >
        <ExternalLink className="mr-2 size-4" />
        Open first
      </Button>
      <BatchDelete
        onClick={async () => {
          await deleteMutation.mutateAsync({
            unitIds,
          });
        }}
      />
    </BatchAction>
  );
}
