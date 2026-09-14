import type { RowActivityDescriptor } from "./mutation";

export function salesPaymentActivity(ownerId: string): RowActivityDescriptor {
 return {
  ownerId,
  tableId: "sales-orders",
  describe(variables) {
   const input = variables && typeof variables === "object" ? variables as { salesIds?: unknown } : {};
   const entityIds = Array.isArray(input.salesIds) ? [...new Set(input.salesIds.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id)))] : [];
   return {
    entityIds,
    label: "Processing payment",
    resolve(data) {
     const result = data && typeof data === "object" ? data as {status?: unknown;terminalPaymentSession?: unknown;appliedSalesIds?:unknown} : {};
     const ids = Array.isArray(result.appliedSalesIds) ? result.appliedSalesIds : [];
     return entityIds.map(entityId => {
      const committed = !result.terminalPaymentSession && result.status === "success" && ids.filter(id => id === entityId).length === 1;
      return {entityId,phase: committed ? "success" : "unknown",label: committed ? "Payment recorded" : result.terminalPaymentSession ? "Awaiting terminal payment" : "Check payment result"};
     });
    },
   };
  },
 };
}
