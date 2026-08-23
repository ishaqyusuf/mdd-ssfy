export type InboundCreatePaneMode = "create_inbound" | "mark_available";

export function shouldOpenInboundCreateContinuation(input: {
	requested: boolean;
	paneOpen: boolean;
}) {
	return input.requested && !input.paneOpen;
}

export function inventoryCreateInboundParamForOpen(
	mode: InboundCreatePaneMode,
) {
	return mode === "create_inbound" ? true : null;
}

export function inventoryCreateInboundParamForClose(paneKind?: string | null) {
	return paneKind === "inbound-create" ? null : undefined;
}
