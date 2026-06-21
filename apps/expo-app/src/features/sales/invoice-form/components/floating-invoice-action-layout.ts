export const INVOICE_FLOATING_BASE_OFFSET = 136;
export const INVOICE_FLOATING_SECONDARY_OFFSET = 200;
export const INVOICE_FLOATING_TERTIARY_OFFSET = 264;
export const INVOICE_FLOATING_OVERLAY_PROCEED_OFFSET = 44;
export const INVOICE_FOOTER_ACTION_HEIGHT = 44;
export const INVOICE_FLOATING_INLINE_PROCEED_OFFSET =
  INVOICE_FOOTER_ACTION_HEIGHT + 15;
export const INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET = 20;
export const INVOICE_FLOATING_HIDDEN_FOOTER_SHIFT = 96;

export type InvoiceFloatingActionLane =
  | "primary"
  | "secondary"
  | "tertiary"
  | "overlayProceed";

export function getInvoiceFloatingActionOffset(
  lane: InvoiceFloatingActionLane,
) {
  switch (lane) {
    case "primary":
      return INVOICE_FLOATING_BASE_OFFSET;
    case "secondary":
      return INVOICE_FLOATING_SECONDARY_OFFSET;
    case "tertiary":
      return INVOICE_FLOATING_TERTIARY_OFFSET;
    case "overlayProceed":
      return INVOICE_FLOATING_OVERLAY_PROCEED_OFFSET;
  }
}

export function getWorkflowProceedFloatingOffset(input: {
  inline: boolean;
  footerActionsHidden?: boolean;
}) {
  if (input.inline) {
    return input.footerActionsHidden
      ? INVOICE_FLOATING_INLINE_PROCEED_HIDDEN_OFFSET
      : INVOICE_FLOATING_INLINE_PROCEED_OFFSET;
  }
  const offset = getInvoiceFloatingActionOffset("overlayProceed");
  return input.footerActionsHidden
    ? Math.max(20, offset - INVOICE_FLOATING_HIDDEN_FOOTER_SHIFT)
    : offset;
}

export function getCustomComponentFloatingOffset(input: {
  proceedVisible: boolean;
  footerActionsHidden?: boolean;
}) {
  const offset = getInvoiceFloatingActionOffset(
    input.proceedVisible ? "tertiary" : "primary",
  );
  return input.footerActionsHidden
    ? Math.max(72, offset - INVOICE_FLOATING_HIDDEN_FOOTER_SHIFT)
    : offset;
}
