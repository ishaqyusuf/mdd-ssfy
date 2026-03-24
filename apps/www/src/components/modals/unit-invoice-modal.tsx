"use client";

import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { Skeleton } from "@gnd/ui/skeleton";
import { UnitInvoiceForm } from "../forms/unit-invoice-form";
import { CustomModal } from "./custom-modal";

export function UnitInvoiceModal() {
  const { editUnitInvoiceId, setParams } = useUnitInvoiceParams();
  const trpc = useTRPC();
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

  return (
    <CustomModal
      open={!!editUnitInvoiceId}
      onOpenChange={(open) => {
        if (!open) {
          setParams(null);
        }
      }}
      size="4xl"
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
      <CustomModal.Content className="lg:max-h-[70vh]">
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
