"use client";

import { useTRPC } from "@/trpc/client";
import type { RouterInputs } from "@api/trpc/routers/_app";
import { useMutation } from "@gnd/ui/tanstack";
import { useEffect, useRef } from "react";

type UsageInput = RouterInputs["newSalesForm"]["adoptionPing"];

export function SalesFormAdoptionTracker(input: UsageInput) {
	const { mode, surface, type } = input;
	const trpc = useTRPC();
	const recorded = useRef(false);
	const ping = useMutation(
		trpc.newSalesForm.adoptionPing.mutationOptions({
			retry: false,
		}),
	);

	useEffect(() => {
		if (recorded.current) return;
		recorded.current = true;
		ping.mutate({ mode, surface, type });
	}, [mode, ping.mutate, surface, type]);

	return null;
}
