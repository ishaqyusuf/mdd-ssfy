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
  type SaveDraftInput = Parameters<typeof realSaveDraft.mutateAsync>[0];
  type SaveFinalInput = Parameters<typeof realSaveFinal.mutateAsync>[0];
  type RecalculateMutationInput = Parameters<
    typeof realRecalculate.mutateAsync
  >[0];

  const saveDraft = async (
    payload: SaveDraftNewSalesFormPayload,
  ): Promise<InvoiceFormSaveResult> => {
    return realSaveDraft.mutateAsync(
      payload as SaveDraftInput,
    ) as Promise<InvoiceFormSaveResult>;
  };

  const saveFinal = async (
    payload: SaveDraftNewSalesFormPayload,
  ): Promise<InvoiceFormSaveResult> => {
    return realSaveFinal.mutateAsync(
      payload as SaveFinalInput,
    ) as Promise<InvoiceFormSaveResult>;
  };

  const deleteLineItem = async (
    input: DeleteNewSalesFormLineItemPayload,
  ): Promise<DeleteLineItemResult> => {
    return realDeleteLineItem.mutateAsync(input) as Promise<DeleteLineItemResult>;
  };

  const recalculate = async (
    input: RecalculateInput,
  ): Promise<NewSalesFormSummary> => {
    const { cccPercentage: _clientOnlyCccPercentage, ...serverInput } = input;
    return realRecalculate.mutateAsync(
      serverInput as RecalculateMutationInput,
    ) as Promise<NewSalesFormSummary>;
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
