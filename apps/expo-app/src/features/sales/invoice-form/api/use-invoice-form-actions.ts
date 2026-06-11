import { _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";
import { calculateInvoiceSummary } from "../lib/calculate-summary";
import type {
  DeleteNewSalesFormLineItemPayload,
  InvoiceFormSaveResult,
  NewSalesFormExtraCost,
  NewSalesFormLineItem,
  NewSalesFormSummary,
  SaveDraftNewSalesFormPayload,
} from "../types";
import { USE_MOCK_INVOICE_FORM } from "./config";

export { USE_MOCK_INVOICE_FORM } from "./config";

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type RecalculateInput = {
  taxRate: number;
  paymentMethod?: string | null;
  cccPercentage?: number | null;
  extraCosts: NewSalesFormExtraCost[];
  lineItems: NewSalesFormLineItem[];
};

type DeleteLineItemResult = InvoiceFormSaveResult & {
  ok?: boolean;
  lineItemId?: number;
};

export function useInvoiceFormActions() {
  const realSaveDraft = useMutation({
    ...(USE_MOCK_INVOICE_FORM
      ? {
          mutationFn: async (payload: SaveDraftNewSalesFormPayload) => {
            await wait(400);
            const prefix = payload.type === "quote" ? "quote" : "order";
            return {
              ...payload,
              slug: payload.slug || `${prefix}-draft-1001`,
              salesId: payload.salesId || 1001,
              orderId: payload.type === "quote" ? "SQ-1001" : "SO-1001",
              inventoryStatus: payload.inventoryStatus ?? null,
              status: "Draft",
              version: `mock-version-${Date.now()}`,
              updatedAt: new Date().toISOString(),
            };
          },
        }
      : _trpc.newSalesForm.saveDraft.mutationOptions()),
  } as any);

  const realSaveFinal = useMutation({
    ...(USE_MOCK_INVOICE_FORM
      ? {
          mutationFn: async (payload: SaveDraftNewSalesFormPayload) => {
            await wait(500);
            const prefix = payload.type === "quote" ? "quote" : "order";
            return {
              ...payload,
              slug: payload.slug || `${prefix}-final-1001`,
              salesId: payload.salesId || 1001,
              orderId: payload.type === "quote" ? "SQ-1001" : "SO-1001",
              inventoryStatus: payload.inventoryStatus ?? null,
              status: "Active",
              version: `mock-final-${Date.now()}`,
              updatedAt: new Date().toISOString(),
            };
          },
        }
      : _trpc.newSalesForm.saveFinal.mutationOptions()),
  } as any);

  const realRecalculate = useMutation({
    ...(USE_MOCK_INVOICE_FORM
      ? {
          mutationFn: async (input: RecalculateInput) => {
            await wait(150);
            return calculateInvoiceSummary({
              lineItems: input.lineItems,
              extraCosts: input.extraCosts,
              taxRate: input.taxRate,
              paymentMethod: input.paymentMethod,
              cccPercentage: input.cccPercentage,
            });
          },
        }
      : _trpc.newSalesForm.recalculate.mutationOptions()),
  } as any);
  const realDeleteLineItem = useMutation({
    ...(USE_MOCK_INVOICE_FORM
      ? {
          mutationFn: async (input: DeleteNewSalesFormLineItemPayload) => {
            await wait(150);
            return {
              ok: true,
              lineItemId: input.lineItemId,
            };
          },
        }
      : _trpc.newSalesForm.deleteLineItem.mutationOptions()),
  } as any);

  const saveDraft = async (
    payload: SaveDraftNewSalesFormPayload,
  ): Promise<InvoiceFormSaveResult> => {
    return realSaveDraft.mutateAsync(payload) as Promise<InvoiceFormSaveResult>;
  };

  const saveFinal = async (
    payload: SaveDraftNewSalesFormPayload,
  ): Promise<InvoiceFormSaveResult> => {
    return realSaveFinal.mutateAsync(payload) as Promise<InvoiceFormSaveResult>;
  };

  const deleteLineItem = async (
    input: DeleteNewSalesFormLineItemPayload,
  ): Promise<DeleteLineItemResult> => {
    return realDeleteLineItem.mutateAsync(input) as Promise<DeleteLineItemResult>;
  };

  const recalculate = async (
    input: RecalculateInput,
  ): Promise<NewSalesFormSummary> => {
    return realRecalculate.mutateAsync(input) as Promise<NewSalesFormSummary>;
  };

  return {
    saveDraft,
    saveFinal,
    deleteLineItem,
    recalculate,
    isSaving: realSaveDraft.isPending || realSaveFinal.isPending,
    isDeletingLine: realDeleteLineItem.isPending,
  };
}
