import "@tanstack/react-query";
import type { QueryEventName } from "@/lib/query-events/registry";
import type { QueryEventScope } from "@/lib/query-events/types";

declare module "@tanstack/react-query" {
	interface Register {
		mutationMeta: {
			debug?: boolean;
			queryEventScope?: QueryEventScope;
			queryEvents?: readonly QueryEventName[] | false;
			toastTitle?: {
				show?: boolean;
				loading?: string;
				success?: string;
				error?: string;
			};
		};
	}
}
