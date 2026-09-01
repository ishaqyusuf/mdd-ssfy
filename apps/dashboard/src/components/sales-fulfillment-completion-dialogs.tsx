"use client";

import { SalesProductionCompletionDialogs } from "@/components/sales-production-completion-dialogs";
import type { ComponentProps } from "react";

type SalesFulfillmentCompletionDialogsProps = Omit<
	ComponentProps<typeof SalesProductionCompletionDialogs>,
	"milestone"
>;

export function SalesFulfillmentCompletionDialogs(
	props: SalesFulfillmentCompletionDialogsProps,
) {
	return (
		<SalesProductionCompletionDialogs {...props} milestone="Fulfillment" />
	);
}
