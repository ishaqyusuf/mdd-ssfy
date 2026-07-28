import { describe, expect, it } from "bun:test";
import { getSalesDocumentLabels } from "./sales-document-labels";

describe("sales document labels", () => {
  it("uses invoice wording for order forms", () => {
    expect(getSalesDocumentLabels("order")).toEqual({
      noun: "Invoice",
      lowerNoun: "invoice",
      detailsTitle: "Invoice details",
      itemFallbackTitle: "Invoice item",
      itemSheetTitle: "Invoice items",
      lineItemLabel: "invoice line item",
      recoveredChangesMessage: "Recovered unsaved local invoice changes.",
      referenceLabel: "Invoice #",
      referencePrefix: "Invoice #",
    });
  });

  it("uses quote wording for quote forms", () => {
    expect(getSalesDocumentLabels("quote")).toEqual({
      noun: "Quote",
      lowerNoun: "quote",
      detailsTitle: "Quote details",
      itemFallbackTitle: "Quote item",
      itemSheetTitle: "Quote items",
      lineItemLabel: "quote line item",
      recoveredChangesMessage: "Recovered unsaved local quote changes.",
      referenceLabel: "Quote #",
      referencePrefix: "Quote #",
    });
  });
});
