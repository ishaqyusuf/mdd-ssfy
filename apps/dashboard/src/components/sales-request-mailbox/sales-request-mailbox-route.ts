import type { RouterInputs } from "@api/trpc/routers/_app";

type SalesRequestMailboxPreviewType =
	RouterInputs["salesRequestMailbox"]["generatePreview"]["type"];

const SALES_REQUEST_MAILBOX_DRAFT_PATHS = {
	order: "/sales-form/create-order",
	quote: "/sales-form/create-quote",
} as const satisfies Record<SalesRequestMailboxPreviewType, string>;

export function getSalesRequestMailboxDraftPath(
	type: SalesRequestMailboxPreviewType,
) {
	return SALES_REQUEST_MAILBOX_DRAFT_PATHS[type];
}
