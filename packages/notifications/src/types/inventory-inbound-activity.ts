import type { NotificationHandler } from "../base";
import {
  type InventoryInboundActivityTags,
  inventoryInboundActivitySchema,
} from "../schemas";

export const inventoryInboundActivity: NotificationHandler = {
  schema: inventoryInboundActivitySchema,
  createActivity(data, author) {
    const payload: InventoryInboundActivityTags = {
      type: "inventory_inbound_activity",
      source: "user",
      priority: 5,
      inboundId: data.inboundId,
      ...(data.supplierId != null ? { supplierId: data.supplierId } : {}),
      ...(data.supplierName ? { supplierName: data.supplierName } : {}),
      ...(data.reference ? { reference: data.reference } : {}),
      activityType: data.activityType,
      ...(data.documentIds?.length ? { documentIds: data.documentIds } : {}),
      ...(data.orderNos?.length ? { orderNos: data.orderNos } : {}),
    };

    const subjectMap = {
      created: "Inbound created",
      documents_uploaded: "Inbound receipt uploaded",
      extraction_started: "Inbound extraction started",
      extraction_completed: "Inbound extraction completed",
      extraction_failed: "Inbound extraction failed",
      extraction_applied: "Inbound extraction applied",
      demands_assigned: "Inbound orders assigned",
      received: "Inbound received",
    } as const;

    const supplierSuffix = data.supplierName ? ` for ${data.supplierName}` : "";

    return {
      type: "inventory_inbound_activity",
      source: "user",
      subject: subjectMap[data.activityType] || "Inbound updated",
      headline:
        data.activityType === "created"
          ? `Inbound #${data.inboundId} was created${supplierSuffix}.`
          : data.activityType === "documents_uploaded"
            ? `Receipt documents were uploaded to inbound #${data.inboundId}${supplierSuffix}.`
            : data.activityType === "extraction_started"
              ? `AI extraction started for inbound #${data.inboundId}.`
              : data.activityType === "extraction_completed"
                ? `AI extraction completed for inbound #${data.inboundId}.`
                : data.activityType === "extraction_failed"
                  ? `AI extraction failed for inbound #${data.inboundId}.`
                  : data.activityType === "extraction_applied"
                    ? `Extracted invoice lines were applied to inbound #${data.inboundId}.`
                    : data.activityType === "demands_assigned"
                      ? `Open order demand was assigned to inbound #${data.inboundId}.`
                      : `Inbound #${data.inboundId} was received.`,
      note: data.note?.trim() || undefined,
      authorId: author.id,
      tags: payload,
    };
  },
};
