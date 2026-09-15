"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import type { ReactNode } from "react";

export function useAssistantDiagnosticUi() {
	const trpc = useTRPC();
	const access = useQuery(trpc.assistant.diagnosticAccess.queryOptions(undefined, {
		staleTime: 30_000,
		refetchInterval: 30_000,
		retry: false,
	}));
	return access.data?.allowed === true && access.data.uiEnabled === true;
}

export function AssistantDiagnosticUiGate({ children }: { children: ReactNode }) {
	return useAssistantDiagnosticUi() ? children : null;
}
