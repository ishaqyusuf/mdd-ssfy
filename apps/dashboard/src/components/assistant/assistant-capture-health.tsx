"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

export function AssistantCaptureHealth() {
	const trpc = useTRPC();
	const query = useQuery(trpc.assistant.captureHealth.queryOptions(undefined, {
		staleTime: 30_000, refetchInterval: 30_000, retry: false,
	}));
	return <section aria-label="Capture health" className="border-b px-5 py-4 text-sm">
		<h3 className="font-medium">Capture health</h3>
		{query.isPending ? <p role="status" className="mt-2 text-muted-foreground">Loading capture counts…</p>
			: query.isError || !query.data?.available ? <p className="mt-2 text-muted-foreground">Capture counts are unavailable. Check the server logs for capture failures.</p>
			: <>
				<p className="mt-1 text-xs text-muted-foreground">Recorded capture attempts today (UTC). Monitoring submissions do not confirm delivery.</p>
				<dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
					{Object.entries({
						"Capture attempts": query.data.counts.attempts,
						"Saved to database": query.data.counts.storageConfirmed,
						"Storage unconfirmed": query.data.counts.storageUnconfirmed,
						"Monitoring submitted": query.data.counts.monitorSubmitted,
						"Monitoring unavailable": query.data.counts.monitorUnavailable,
						"Monitoring failed": query.data.counts.monitorFailed,
					}).map(([label, count]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium tabular-nums">{count}</dd></div>)}
				</dl>
			</>}
	</section>;
}
