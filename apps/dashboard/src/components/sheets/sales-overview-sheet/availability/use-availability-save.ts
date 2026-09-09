"use client";
import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useRef } from "react";

type Input = Exclude<
	RouterInputs["sales"]["markProductionMaterialsAvailable"],
	void
>;
export function useAvailabilitySave(onSaved: (inboundId: number) => void) {
	const trpc = useTRPC();
	const client = useQueryClient();
	const requests = useRef(new Map<string, string>());
	const locked = useRef(false);
	const mutation = useMutation(
		trpc.sales.markProductionMaterialsAvailable.mutationOptions({
			onSuccess: async (result) => {
				// This is a committed receipt. Closing and refresh failure must not offer a
				// second stock write; the central mutation event refreshes the other surfaces.
				onSaved(result.inboundId);
				const refresh = await Promise.allSettled([
					client.invalidateQueries({
						queryKey: trpc.sales.productionAvailability.queryKey({
							salesOrderId: result.salesOrderId,
						}),
					}),
					client.invalidateQueries({
						queryKey: trpc.sales.productionPendingInbounds.pathKey(),
					}),
				]);
				toast({
					title: "Materials marked available",
					description: refresh.some((result) => result.status === "rejected")
						? "Saved. Refresh Production to load the latest material information."
						: result.remainingQty > 0
							? `${result.remainingQty} units still need material coverage.`
							: result.needsReview
								? "Materials saved. Some production reviews still need attention."
								: undefined,
					variant: "success",
				});
			},
			onError: (error) =>
				toast({
					title: "Unable to mark materials available",
					description: error.message,
					variant: "destructive",
				}),
			onSettled: () => {
				locked.current = false;
			},
		}),
	);
	return {
		...mutation,
		save: (input: Omit<Input, "idempotencyKey">) => {
			if (locked.current) return;
			locked.current = true;
			const fingerprint = JSON.stringify(input);
			const key = requests.current.get(fingerprint) ?? crypto.randomUUID();
			requests.current.set(fingerprint, key);
			mutation.mutate({ ...input, idempotencyKey: key });
		},
	};
}
