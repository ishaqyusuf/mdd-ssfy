"use client";

import { useTRPC } from "@/trpc/client";
import type {
	SalesFormWorkflowDataSource,
	SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useDealerSalesFormWorkflowData(): SalesFormWorkflowDataSource {
	const trpc = useTRPC();

	return useMemo(
		() => ({
			useStepRouting: () =>
				useQuery(trpc.dealerPortal.workflowReference.queryOptions()),
			useStepComponents: (input: SalesFormWorkflowStepComponentInput) =>
				useQuery(
					trpc.sales.getStepComponents.queryOptions(
						{
							stepId: input.stepId || undefined,
							stepTitle: input.stepTitle || null,
						},
						{
							enabled:
								input.enabled !== false &&
								Boolean(input.stepId || input.stepTitle),
						},
					),
				),
			resolveImageSrc: (src?: string | null) => {
				const value = String(src || "").trim();
				if (!value) return null;
				if (
					value.startsWith("http://") ||
					value.startsWith("https://") ||
					value.startsWith("data:") ||
					value.startsWith("blob:")
				) {
					return value;
				}
				return value.startsWith("/") ? value : `/${value}`;
			},
		}),
		[trpc],
	);
}
