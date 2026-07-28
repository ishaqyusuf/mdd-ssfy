import type { NewSalesFormType } from "../types";

export function getSalesDocumentLabels(type: NewSalesFormType) {
  const noun = type === "quote" ? "Quote" : "Invoice";
  const lowerNoun = noun.toLowerCase();

  return {
    noun,
    lowerNoun,
    detailsTitle: `${noun} details`,
    itemFallbackTitle: `${noun} item`,
    itemSheetTitle: `${noun} items`,
    lineItemLabel: `${lowerNoun} line item`,
    recoveredChangesMessage: `Recovered unsaved local ${lowerNoun} changes.`,
    referenceLabel: `${noun} #`,
    referencePrefix: `${noun} #`,
  };
}
