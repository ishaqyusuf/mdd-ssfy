"use client";

import { DocumentUploader } from "@/components/common/document-uploader";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card } from "@gnd/ui/namespace";
import { Input } from "@gnd/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gnd/ui/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export function InboundReceivingPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [selectedInboundId, setSelectedInboundId] = useState<number | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedDemandIds, setSelectedDemandIds] = useState<number[]>([]);
  const [receiveInputs, setReceiveInputs] = useState<
    Record<number, { qtyReceived: string; unitPrice: string }>
  >({});

  const suppliersQuery = useQuery(trpc.inventories.inboundSuppliers.queryOptions());
  const shipmentsQuery = useQuery(
    trpc.inventories.inboundShipments.queryOptions({}),
  );
  const demandQueueQuery = useQuery(
    trpc.inventories.inboundDemandQueue.queryOptions({}),
  );

  const shipments = shipmentsQuery.data ?? [];
  const suppliers = suppliersQuery.data ?? [];
  const demandQueue = demandQueueQuery.data ?? [];

  useEffect(() => {
    if (!shipments.length) return;
    if (selectedInboundId && shipments.some((shipment) => shipment.id === selectedInboundId)) {
      return;
    }
    setSelectedInboundId(shipments[0]?.id ?? null);
  }, [shipments, selectedInboundId]);

  const selectedShipmentQuery = useQuery(
    trpc.inventories.inboundShipmentDetail.queryOptions(
      {
        inboundId: selectedInboundId ?? 0,
      },
      {
        enabled: !!selectedInboundId,
      },
    ),
  );

  const inboundDocumentsQuery = useQuery(
    trpc.inventories.inboundDocuments.queryOptions(
      {
        inboundId: selectedInboundId ?? 0,
      },
      {
        enabled: !!selectedInboundId,
      },
    ),
  );

  const inboundExtractionsQuery = useQuery(
    trpc.inventories.inboundExtractions.queryOptions(
      {
        inboundId: selectedInboundId ?? 0,
      },
      {
        enabled: !!selectedInboundId,
      },
    ),
  );

  const inboundActivityQuery = useQuery(
    trpc.inventories.inboundActivity.queryOptions(
      {
        inboundId: selectedInboundId ?? 0,
      },
      {
        enabled: !!selectedInboundId,
      },
    ),
  );

  const selectedShipment = selectedShipmentQuery.data ?? null;
  const inboundDocuments = inboundDocumentsQuery.data ?? [];
  const inboundExtractions = inboundExtractionsQuery.data ?? [];
  const inboundActivity = inboundActivityQuery.data ?? [];

  useEffect(() => {
    if (!selectedShipment?.items?.length) return;
    setReceiveInputs((current) => {
      const next = { ...current };
      for (const item of selectedShipment.items) {
        next[item.id] = next[item.id] || {
          qtyReceived: String(item.qty ?? ""),
          unitPrice:
            item.unitPrice == null ? "" : String(Number(item.unitPrice || 0)),
        };
      }
      return next;
    });
  }, [selectedShipment]);

  const refreshInboundData = async (inboundId?: number | null) => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: trpc.inventories.inboundShipments.queryKey({}),
      }),
      queryClient.invalidateQueries({
        queryKey: trpc.inventories.inboundDemandQueue.queryKey({}),
      }),
      inboundId
        ? queryClient.invalidateQueries({
            queryKey: trpc.inventories.inboundShipmentDetail.queryKey({
              inboundId,
            }),
          })
        : Promise.resolve(),
      inboundId
        ? queryClient.invalidateQueries({
            queryKey: trpc.inventories.inboundDocuments.queryKey({
              inboundId,
            }),
          })
        : Promise.resolve(),
      inboundId
        ? queryClient.invalidateQueries({
            queryKey: trpc.inventories.inboundExtractions.queryKey({
              inboundId,
            }),
          })
        : Promise.resolve(),
      inboundId
        ? queryClient.invalidateQueries({
            queryKey: trpc.inventories.inboundActivity.queryKey({
              inboundId,
            }),
          })
        : Promise.resolve(),
    ]);
  };

  const createInboundMutation = useMutation(
    trpc.inventories.createInboundShipment.mutationOptions({
      onSuccess(data) {
        setSelectedInboundId(data.id);
        toast.success(`Inbound #${data.id} created`);
        refreshInboundData(data.id);
      },
    }),
  );

  const createFromDemandsMutation = useMutation(
    trpc.inventories.createInboundShipmentFromDemands.mutationOptions({
      onSuccess(data) {
        setSelectedInboundId(data.inboundId);
        setSelectedDemandIds([]);
        toast.success(`Inbound #${data.inboundId} created from demand`);
        refreshInboundData(data.inboundId);
      },
    }),
  );

  const assignDemandsMutation = useMutation(
    trpc.inventories.assignInboundDemands.mutationOptions({
      onSuccess() {
        setSelectedDemandIds([]);
        toast.success("Demand linked to inbound");
        refreshInboundData(selectedInboundId);
      },
    }),
  );

  const extractMutation = useMutation(
    trpc.inventories.extractInboundDocuments.mutationOptions({
      onSuccess() {
        toast.success("Extraction finished");
        refreshInboundData(selectedInboundId);
      },
      onError(error) {
        toast.error(error.message || "Extraction failed");
      },
    }),
  );

  const uploadDocumentsMutation = useMutation(
    trpc.inventories.uploadInboundDocuments.mutationOptions({
      onSuccess() {
        toast.success("Inbound documents uploaded");
        refreshInboundData(selectedInboundId);
      },
      onError(error) {
        toast.error(error.message || "Unable to upload inbound documents");
      },
    }),
  );

  const applyExtractionMutation = useMutation(
    trpc.inventories.applyInboundExtraction.mutationOptions({
      onSuccess() {
        toast.success("Extraction applied to inbound items");
        refreshInboundData(selectedInboundId);
      },
    }),
  );

  const receiveInboundMutation = useMutation(
    trpc.inventories.receiveInboundShipment.mutationOptions({
      onSuccess() {
        toast.success("Inbound receipt posted to stock");
        refreshInboundData(selectedInboundId);
      },
    }),
  );

  const selectedDemandRows = useMemo(
    () => demandQueue.filter((row) => selectedDemandIds.includes(row.id)),
    [demandQueue, selectedDemandIds],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)_380px]">
      <Card className="p-4 space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Receiving Tray</h3>
          <p className="text-xs text-slate-500">
            Open shortage demand that still needs inbound coverage.
          </p>
        </div>

        <div className="space-y-3 rounded-xl border p-3">
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                if (!selectedSupplierId) {
                  toast.error("Select a supplier first");
                  return;
                }
                createInboundMutation.mutate({
                  supplierId: Number(selectedSupplierId),
                });
              }}
              disabled={createInboundMutation.isPending}
            >
              New Inbound
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (!selectedSupplierId) {
                  toast.error("Select a supplier first");
                  return;
                }
                if (!selectedDemandIds.length) {
                  toast.error("Select demand rows to create inbound from");
                  return;
                }
                createFromDemandsMutation.mutate({
                  supplierId: Number(selectedSupplierId),
                  demandIds: selectedDemandIds,
                });
              }}
              disabled={createFromDemandsMutation.isPending}
            >
              Create From Demand
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {demandQueue.map((row) => {
            const checked = selectedDemandIds.includes(row.id);
            const orderNo = row.lineItemComponent.parent.sale?.orderId;
            return (
              <label
                key={row.id}
                className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    setSelectedDemandIds((current) =>
                      event.target.checked
                        ? [...current, row.id]
                        : current.filter((id) => id !== row.id),
                    );
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {row.inventoryVariant.inventory.name}
                    </p>
                    <span className="text-xs uppercase text-slate-500">
                      {row.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {orderNo ? `Order ${orderNo}` : "Unassigned order"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Need {Number(row.qty || 0)} / received {Number(row.qtyReceived || 0)}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Inbound Shipments</h3>
            <p className="text-xs text-slate-500">
              Snap receipt, extract invoice lines, then receive into stock.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            {shipments.map((shipment) => (
              <button
                key={shipment.id}
                type="button"
                onClick={() => setSelectedInboundId(shipment.id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedInboundId === shipment.id ? "border-slate-900 bg-slate-50" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Inbound #{shipment.id}</p>
                  <span className="text-xs uppercase text-slate-500">
                    {shipment.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{shipment.supplier.name}</p>
                <p className="text-xs text-slate-500">
                  Docs {shipment.documentCount} | Items {shipment.itemCount} | Extractions{" "}
                  {shipment.extractionCount}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {selectedShipment ? (
              <>
                <div className="rounded-2xl border p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">
                        Inbound #{selectedShipment.id} · {selectedShipment.supplier.name}
                      </h4>
                      <p className="text-sm text-slate-500">
                        Reference {selectedShipment.reference || "None"} · Status{" "}
                        {selectedShipment.status}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!selectedDemandIds.length) {
                          toast.error("Select demand rows to assign");
                          return;
                        }
                        assignDemandsMutation.mutate({
                          inboundId: selectedShipment.id,
                          demandIds: selectedDemandIds,
                        });
                      }}
                      disabled={assignDemandsMutation.isPending}
                    >
                      Assign Selected Orders
                    </Button>
                  </div>
                  {selectedDemandRows.length ? (
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                      Pending assignment:{" "}
                      {selectedDemandRows
                        .map((row) => row.lineItemComponent.parent.sale?.orderId)
                        .filter(Boolean)
                        .join(", ") || `${selectedDemandRows.length} demand rows`}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">Receipt Snap</h4>
                      <p className="text-sm text-slate-500">
                        Upload packing slips or vendor invoices to this inbound.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        extractMutation.mutate({
                          inboundId: selectedShipment.id,
                        })
                      }
                      disabled={
                        extractMutation.isPending || inboundDocuments.length === 0
                      }
                    >
                      Run AI Extraction
                    </Button>
                  </div>

                  <DocumentUploader
                    submitLabel="Upload to inbound"
                    onUpload={(payload) =>
                      uploadDocumentsMutation
                        .mutateAsync({
                          inboundId: selectedShipment.id,
                          files: payload.files,
                          note: payload.note ?? null,
                        })
                        .then((result) => ({
                          documents: result.documents ?? [],
                        }))
                    }
                  />

                  {inboundDocuments.length ? (
                    <div className="space-y-2">
                      {inboundDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="rounded-xl border px-3 py-2 text-sm"
                        >
                          <div className="font-medium">{document.title}</div>
                          <div className="text-xs text-slate-500">
                            {document.uploadedByName || "Unknown"} ·{" "}
                            {document.mimeType || "document"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border p-4 space-y-4">
                  <h4 className="font-semibold">Extraction Review</h4>
                  {inboundExtractions.length ? (
                    inboundExtractions.map((extraction) => (
                      <div key={extraction.id} className="rounded-xl border p-3 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              Extraction #{extraction.id}
                            </p>
                            <p className="text-xs text-slate-500">
                              {extraction.invoiceNumber || "No invoice number"} ·{" "}
                              {extraction.status}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              applyExtractionMutation.mutate({
                                inboundId: selectedShipment.id,
                                extractionId: extraction.id,
                              })
                            }
                            disabled={applyExtractionMutation.isPending}
                          >
                            Apply to Receiving List
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {extraction.lines.map((line) => (
                            <div
                              key={line.id}
                              className="grid gap-2 rounded-lg bg-slate-50 p-3 text-xs lg:grid-cols-[minmax(0,1fr)_100px_120px_140px]"
                            >
                              <div>
                                <p className="font-medium">
                                  {line.rawDescription || "Untitled line"}
                                </p>
                                <p className="text-slate-500">
                                  SKU {line.rawSku || "N/A"}
                                </p>
                              </div>
                              <div>Qty {Number(line.qty || 0)}</div>
                              <div>
                                Match {line.inventory?.name || line.inventoryVariant?.sku || "Unresolved"}
                              </div>
                              <div className="uppercase text-slate-500">
                                {line.matchStatus}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No extraction has been run for this inbound yet.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-semibold">Receiving List</h4>
                    <Button
                      onClick={() => {
                        receiveInboundMutation.mutate({
                          inboundId: selectedShipment.id,
                          items: selectedShipment.items.map((item) => ({
                            inboundShipmentItemId: item.id,
                            qtyReceived: Number(
                              receiveInputs[item.id]?.qtyReceived || item.qty || 0,
                            ),
                            unitPrice:
                              receiveInputs[item.id]?.unitPrice === ""
                                ? null
                                : Number(
                                    receiveInputs[item.id]?.unitPrice ||
                                      item.unitPrice ||
                                      0,
                                  ),
                          })),
                        });
                      }}
                      disabled={receiveInboundMutation.isPending || !selectedShipment.items.length}
                    >
                      Receive / Post Stock
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {selectedShipment.items.map((item) => (
                      <div key={item.id} className="rounded-xl border p-3 space-y-3">
                        <div>
                          <p className="text-sm font-medium">
                            {item.inventoryVariant.inventory.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Planned qty {Number(item.qty || 0)}
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            value={receiveInputs[item.id]?.qtyReceived ?? ""}
                            onChange={(event) =>
                              setReceiveInputs((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  qtyReceived: event.target.value,
                                },
                              }))
                            }
                            placeholder="Qty received"
                          />
                          <Input
                            value={receiveInputs[item.id]?.unitPrice ?? ""}
                            onChange={(event) =>
                              setReceiveInputs((current) => ({
                                ...current,
                                [item.id]: {
                                  ...current[item.id],
                                  unitPrice: event.target.value,
                                },
                              }))
                            }
                            placeholder="Unit price"
                          />
                        </div>
                        {item.inboundDemands.length ? (
                          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                            Linked orders:{" "}
                            {item.inboundDemands
                              .map((demand) => demand.lineItemComponent.parent.sale?.orderId)
                              .filter(Boolean)
                              .join(", ") || "None"}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed p-6 text-sm text-slate-500">
                Create or select an inbound to start receiving.
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Inbound Activity</h3>
          <p className="text-xs text-slate-500">
            Receipt uploads, extraction, assignment, and receiving timeline.
          </p>
        </div>
        <div className="space-y-3">
          {inboundActivity.map((activity) => (
            <div key={activity.id} className="rounded-xl border p-3">
              <p className="text-sm font-medium">{activity.subject}</p>
              <p className="text-xs text-slate-500">{activity.headline}</p>
              {activity.documents?.length ? (
                <p className="pt-2 text-xs text-slate-500">
                  Documents: {activity.documents.map((document) => document?.title).join(", ")}
                </p>
              ) : null}
            </div>
          ))}
          {!inboundActivity.length ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
