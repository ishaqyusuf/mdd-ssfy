"use client";

import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { Skeleton } from "@gnd/ui/skeleton";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { UnitInvoiceForm } from "../forms/unit-invoice-form";
import { CustomModal } from "./custom-modal";

export function UnitInvoiceModal() {
  const { editUnitInvoiceId, setParams } = useUnitInvoiceParams();
  const trpc = useTRPC();
  const lastTriggeredHomeIdRef = useRef<number | null>(null);
  const sweepTrigger = useMutation(
    trpc.taskTrigger.trigger.mutationOptions({
      onError: () => {
        lastTriggeredHomeIdRef.current = null;
      },
    }),
  );
  const { data, isPending } = useQuery(
    trpc.community.getUnitInvoiceForm.queryOptions(
      {
        homeId: editUnitInvoiceId!,
      },
      {
        enabled: !!editUnitInvoiceId,
      },
    ),
  );

  useEffect(() => {
    if (!editUnitInvoiceId) {
      lastTriggeredHomeIdRef.current = null;
      return;
    }

    if (lastTriggeredHomeIdRef.current === editUnitInvoiceId) return;

    lastTriggeredHomeIdRef.current = editUnitInvoiceId;
    sweepTrigger.mutate({
      taskName: "run-unit-invoice-duplicate-sweeper-now",
      payload: {
        homeId: editUnitInvoiceId,
        reason: "invoice-open",
      },
    });
  }, [editUnitInvoiceId, sweepTrigger]);

  return (
    <CustomModal
      open={!!editUnitInvoiceId}
      onOpenChange={(open) => {
        if (!open) {
          setParams(null);
        }
      }}
      size="5xl"
      title={
        data
          ? `${data.project?.title} • ${data.lotBlock}`
          : "Unit Invoice"
      }
      description={
        data
          ? `${data.modelName} • ${data.project?.builder?.name || "Community"}`
          : "Invoice details"
      }
    >
      <CustomModal.Content className="max-h-[60vh] sm:max-h-[70vh]">
        {isPending || !data ? (
          <div className="grid gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        ) : (
          <UnitInvoiceForm unitInvoice={data} />
        )}
      </CustomModal.Content>
    </CustomModal>
  );
}
