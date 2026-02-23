import { RouterInputs, RouterOutputs } from "@api/trpc/routers/_app";
import { z } from "zod";

export type NewSalesFormBootstrapInput = RouterInputs["newSalesForm"]["bootstrap"];
export type NewSalesFormGetInput = RouterInputs["newSalesForm"]["get"];
export type NewSalesFormSaveDraftInput =
  RouterInputs["newSalesForm"]["saveDraft"];
export type NewSalesFormSaveFinalInput =
  RouterInputs["newSalesForm"]["saveFinal"];
export type NewSalesFormRecalculateInput =
  RouterInputs["newSalesForm"]["recalculate"];
export type NewSalesFormDeleteLineItemInput =
  RouterInputs["newSalesForm"]["deleteLineItem"];

export type NewSalesFormRecord = RouterOutputs["newSalesForm"]["get"];
export type NewSalesFormSummary = NewSalesFormRecord["summary"];
export type NewSalesFormLineItem = NewSalesFormRecord["lineItems"][number];
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

