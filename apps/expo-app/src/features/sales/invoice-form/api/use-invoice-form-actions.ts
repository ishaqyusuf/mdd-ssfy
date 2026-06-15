import { _trpc } from "@/components/static-trpc";
import { useMutation } from "@tanstack/react-query";
import type {
  DeleteNewSalesFormLineItemPayload,
  InvoiceFormSaveResult,
  NewSalesFormExtraCost,
  NewSalesFormLineItem,
  NewSalesFormSummary,
  SaveDraftNewSalesFormPayload,
} from "../types";

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
  const realSaveDraft = useMutation(
    _trpc.newSalesForm.saveDraft.mutationOptions(),
  );
  const realSaveFinal = useMutation(
    _trpc.newSalesForm.saveFinal.mutationOptions(),
  );
  const realRecalculate = useMutation(
    _trpc.newSalesForm.recalculate.mutationOptions(),
  );
  const realDeleteLineItem = useMutation(
    _trpc.newSalesForm.deleteLineItem.mutationOptions(),
  );

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
