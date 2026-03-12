"use client";

import { useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import {
  PackingProvider,
  PackingItemProvider,
  usePacking,
  usePackingItem,
} from "@/hooks/use-sales-packing";
import { PackingItemForm } from "@/components/packing-item-form";
import { PackingItemListings } from "@/components/packing-item-listings";
import { PackingProgress } from "@/components/packing-progress";
import { Progress } from "@/components/(clean-code)/progress";
import { QtyLabel } from "@/components/qty-label";
import { PackingTabSkeleton } from "@/components/sheets/sales-overview-sheet/packing-tab.skeleton";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Badge } from "@gnd/ui/badge";
import { hasQty } from "@gnd/utils/sales";
import { cn } from "@gnd/ui/cn";
import { toast } from "@gnd/ui/use-toast";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  dispatchId?: number | null;
  salesNo?: string | null;
};

export function DispatchPackingOverview({ dispatchId, salesNo }: Props) {
  const trpc = useTRPC();
  const query = useQuery(
    trpc.dispatch.dispatchOverviewV2.queryOptions(
      {
        dispatchId: dispatchId || undefined,
        salesNo: salesNo || undefined,
      },
      {
        enabled: !!dispatchId,
      },
    ),
  );

  if (query.isLoading) return <PackingTabSkeleton />;
  if (!query.data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Unable to load dispatch packing overview.
        </CardContent>
      </Card>
    );
  }

  return (
    <PackingProvider
      args={[
        {
          data: query.data as any,
        },
      ]}
    >
      <DispatchPackingOverviewContent />
    </PackingProvider>
  );
}

function DispatchPackingOverviewContent() {
  const ctx = usePacking();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const { data } = ctx;
  const dispatch = data?.dispatch;
  const order = data?.order;
  const address = data?.address || {};
  const customer = order?.customer || {};
  const duplicateInsight = data?.duplicateInsight;
  const summary = data?.summary || {
    total: 0,
    deliverable: 0,
    listed: 0,
    packed: 0,
    pending: 0,
    available: 0,
  };

  const rows = useMemo(() => data?.dispatchItems || [], [data?.dispatchItems]);
  const duplicateDispatches = useMemo(
    () => duplicateInsight?.dispatches || [],
    [duplicateInsight?.dispatches],
  );
  const [keepDispatchId, setKeepDispatchId] = useState<number | null>(null);
  const canResolveDuplicates =
    auth.roleTitle?.toLowerCase() === "super admin";

  useEffect(() => {
    setKeepDispatchId((prev) => {
      const hasPrev = duplicateDispatches.some((item) => item.id === prev);
      if (hasPrev) return prev ?? null;
      if (duplicateInsight?.currentDispatchId) return duplicateInsight.currentDispatchId;
      if (duplicateInsight?.recommendedKeepDispatchId)
        return duplicateInsight.recommendedKeepDispatchId;
      return duplicateDispatches[0]?.id ?? null;
    });
  }, [
    duplicateDispatches,
    duplicateInsight?.currentDispatchId,
    duplicateInsight?.recommendedKeepDispatchId,
  ]);

  const resolveDuplicate = useMutation(
    trpc.dispatch.resolveDuplicateGroup.mutationOptions({
      async onSuccess() {
        await Promise.all([
          ctx.invalidate(),
          queryClient.invalidateQueries({
            queryKey: trpc.dispatch.index.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dispatch.assignedDispatch.pathKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.dispatch.findDuplicateGroups.queryKey(),
          }),
        ]);
        toast({
          variant: "success",
          title: "Duplicate dispatch resolved",
          description: "Dispatch duplicates were cleaned successfully.",
        });
      },
      onError(error) {
        toast({
          variant: "error",
          title: "Unable to resolve duplicate",
          description: error?.message || "Please try again.",
        });
      },
    }),
  );

  const onResolveAllDuplicates = () => {
    if (!order?.id || !keepDispatchId) return;
    const deleteDispatchIds = duplicateDispatches
      .map((item) => item.id)
      .filter((id) => id !== keepDispatchId);
    if (!deleteDispatchIds.length) {
      toast({
        variant: "error",
        title: "No duplicates to remove",
        description: "Only one active dispatch remains.",
      });
      return;
    }
    resolveDuplicate.mutate({
      salesId: order.id,
      keepDispatchId,
      deleteDispatchIds,
    });
  };

  const onDeleteDuplicate = (deleteDispatchId: number) => {
    if (!order?.id || !keepDispatchId) return;
    if (deleteDispatchId === keepDispatchId) {
      toast({
        variant: "error",
        title: "Keep dispatch selected",
        description: "Change keep dispatch before deleting this one.",
      });
      return;
    }
    resolveDuplicate.mutate({
      salesId: order.id,
      keepDispatchId,
      deleteDispatchIds: [deleteDispatchId],
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">
                Dispatch Packing Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {order?.orderId} • Dispatch #{dispatch?.id}
              </p>
            </div>
            <Progress>
              <Progress.Status badge>
                {dispatch?.status || "queue"}
              </Progress.Status>
            </Progress>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Total" value={summary.total} />
          <Metric label="Deliverable" value={summary.deliverable} />
          <Metric label="Available" value={summary.available} />
          <Metric label="Listed" value={summary.listed} />
          <Metric label="Packed" value={summary.packed} />
          <Metric label="Pending" value={summary.pending} />
        </CardContent>
        <CardContent className="pt-0">
          <PackingProgress />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Shipping Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Recipient: </span>
              {address.name || customer.name || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {address.phoneNo || customer.phoneNo || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {address.email || customer.email || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
              {formatAddress(address)}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Delivery Mode: </span>
              {dispatch?.deliveryMode || "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Driver: </span>
              {dispatch?.driver?.name || "Unassigned"}
            </p>
            <p>
              <span className="text-muted-foreground">Dispatch #: </span>
              {dispatch?.dispatchNumber || `DISP-${dispatch?.id || "-"}`}
            </p>
            <p>
              <span className="text-muted-foreground">Due Date: </span>
              {formatDate(dispatch?.dueDate)}
            </p>
          </div>
        </CardContent>
      </Card>

      {duplicateInsight?.isDuplicate ? (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-700" />
                <div>
                  <CardTitle className="text-base text-amber-900">
                    Is this a duplicate dispatch?
                  </CardTitle>
                  <p className="text-sm text-amber-800">
                    Found {duplicateDispatches.length} active dispatches for this
                    sale. Review statuses and packing before cleanup.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                disabled={
                  resolveDuplicate.isPending || !keepDispatchId || !canResolveDuplicates
                }
                onClick={onResolveAllDuplicates}
              >
                {resolveDuplicate.isPending
                  ? "Resolving..."
                  : "Resolve All Duplicates"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!canResolveDuplicates ? (
              <p className="text-xs text-amber-900">
                Duplicate cleanup actions require Super Admin access.
              </p>
            ) : null}
            {duplicateDispatches.map((item) => {
              const isKeep = keepDispatchId === item.id;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-md border bg-background p-3",
                    isKeep && "border-emerald-500",
                    item.isCurrent && "ring-1 ring-blue-300",
                  )}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {item.dispatchNumber || `Dispatch #${item.id}`}
                        </p>
                        <Progress>
                          <Progress.Status badge>
                            {item.status || "queue"}
                          </Progress.Status>
                        </Progress>
                        {item.isCurrent ? (
                          <Badge variant="secondary">Current</Badge>
                        ) : null}
                        {isKeep ? <Badge>Keep</Badge> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Driver: {item.driverName || "Unassigned"} • Due:{" "}
                        {formatDate(item.dueDate)} • Items: {item.itemCount} •
                        Packed items: {item.packedItemCount}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span>
                          Listed: <QtyLabel {...item.listedQty} />
                        </span>
                        <span>
                          Packed: <QtyLabel {...item.packedQty} />
                        </span>
                        <span
                          className={cn(
                            item.pendingPackingTotal > 0 && "text-amber-700",
                          )}
                        >
                          Pending: <QtyLabel {...item.pendingPackingQty} />
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={isKeep ? "default" : "outline"}
                        disabled={resolveDuplicate.isPending || !canResolveDuplicates}
                        onClick={() => setKeepDispatchId(item.id)}
                      >
                        Keep
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={
                          resolveDuplicate.isPending || isKeep || !canResolveDuplicates
                        }
                        onClick={() => onDeleteDuplicate(item.id)}
                      >
                        Delete Duplicate
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!ctx.isQueue || ctx.isStarting}
            onClick={ctx.onStartDispatch}
          >
            Start Dispatch
          </Button>
          <Button
            variant="outline"
            disabled={ctx.isCancelled}
            onClick={() => ctx.onPackDispatch("available")}
          >
            Pack Available
          </Button>
          <Button
            variant="outline"
            disabled={ctx.isCancelled}
            onClick={() => ctx.onPackDispatch("all")}
          >
            Pack All
          </Button>
          <Button
            variant="outline"
            disabled={ctx.isCompleting}
            onClick={() => ctx.onCompleteDispatch("packed_only")}
          >
            Complete with Packed
          </Button>
          <Button
            disabled={ctx.isCompleting}
            onClick={() => ctx.onCompleteDispatch("pack_all")}
          >
            Pack All + Complete
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((item) => (
            <PackingItemProvider
              key={item.uid}
              args={[
                {
                  item: item as any,
                },
              ]}
            >
              <ItemRow />
            </PackingItemProvider>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US");
}

function formatAddress(address: {
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}) {
  const parts = [
    address?.address1,
    address?.address2,
    [address?.city, address?.state].filter(Boolean).join(", "),
    address?.country,
  ].filter(Boolean);
  return parts.length ? parts.join(" • ") : "-";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ItemRow() {
  const ctx = usePacking();
  const { item } = usePackingItem() as any;
  const selected = ctx.packItemUid === item.uid;
  const availableQty = item?.deliverableQty;

  return (
    <div className="rounded-md border p-3">
      <div
        className="flex cursor-pointer flex-col gap-3 md:flex-row md:items-center md:justify-between"
        onClick={() => {
          if (selected) ctx.setPackItemUid(null);
          else ctx.setPackItemUid(item.uid);
        }}
      >
        <div className="space-y-1">
          <p className="font-medium">{item.title}</p>
          <p className="text-xs uppercase text-muted-foreground">{item.subtitle}</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <span>
              Available: <QtyLabel {...availableQty} />
            </span>
            <span>
              Listed: <QtyLabel {...item.listedQty} />
            </span>
            <span>
              Packed: <QtyLabel {...item.packedQty} />
            </span>
            <span className={cn(item?.nonDeliverableQty?.qty > 0 && "text-amber-700") }>
              Pending: <QtyLabel {...item.nonDeliverableQty} />
            </span>
          </div>
        </div>

        {hasQty(availableQty) ? (
          <Button
            variant={selected ? "secondary" : "outline"}
            onClick={(e) => {
              e.stopPropagation();
              if (selected) ctx.setPackItemUid(null);
              else ctx.setPackItemUid(item.uid);
            }}
          >
            {selected ? "Close" : "Pack"}
          </Button>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-3 space-y-3 border-t pt-3">
          <PackingItemForm />
          <PackingItemListings />
        </div>
      ) : null}
    </div>
  );
}
