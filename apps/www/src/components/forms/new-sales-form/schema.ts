import { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { z } from "zod";

export type NewSalesFormBootstrapInput = Exclude<
    RouterInputs["newSalesForm"]["bootstrap"],
    void
>;
export type NewSalesFormGetInput = Exclude<
    RouterInputs["newSalesForm"]["get"],
    void
>;
export type NewSalesFormStepRoutingInput = Exclude<
    RouterInputs["newSalesForm"]["getStepRouting"],
    void
>;
export type NewSalesFormShelfCategoriesInput = Exclude<
    RouterInputs["newSalesForm"]["getShelfCategories"],
    void
>;
export type NewSalesFormShelfProductsInput = Exclude<
    RouterInputs["newSalesForm"]["getShelfProducts"],
    void
>;
export type NewSalesFormSaveDraftInput = Exclude<
    RouterInputs["newSalesForm"]["saveDraft"],
    void
>;
export type NewSalesFormSaveFinalInput = Exclude<
    RouterInputs["newSalesForm"]["saveFinal"],
    void
>;
export type NewSalesFormRecalculateInput = Exclude<
    RouterInputs["newSalesForm"]["recalculate"],
    void
>;
export type NewSalesFormResolveCustomerInput = Exclude<
    RouterInputs["newSalesForm"]["resolveCustomer"],
    void
>;
export type NewSalesFormDeleteLineItemInput = Exclude<
    RouterInputs["newSalesForm"]["deleteLineItem"],
    void
>;

export type NewSalesFormRecord = RouterOutputs["newSalesForm"]["get"];
export type NewSalesFormStepRouting =
    RouterOutputs["newSalesForm"]["getStepRouting"];
export type NewSalesFormSummary = NewSalesFormRecord["summary"];
export type NewSalesFormLineItem = NewSalesFormRecord["lineItems"][number];
export type NewSalesFormExtraCost = NewSalesFormRecord["extraCosts"][number];
export type NewSalesFormMeta = NewSalesFormRecord["form"];

export const saveStatusSchema = z.enum([
  "idle",
  "saving",
  "saved",
  "error",
  "stale",
]);
export type SaveStatus = z.infer<typeof saveStatusSchema>;

export const newSalesFormUiStateSchema = z.object({
  saveStatus: saveStatusSchema.default("idle"),
  dirty: z.boolean().default(false),
  lastSavedAt: z.string().nullable().default(null),
  lastError: z.string().nullable().default(null),
});
export type NewSalesFormUiState = z.infer<typeof newSalesFormUiStateSchema>;
