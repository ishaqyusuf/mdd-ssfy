/** @jsxImportSource react */
"use client";

import {
	salesChangeActivityStatus,
	type SalesItemChangeSummary,
} from "@gnd/sales/sales-change-history";
import { Badge } from "@gnd/ui/badge";
import { parseAsInteger, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

export function SalesChangeActivity({
	activityId,
	tags,
	summary,
}: {
	activityId: number;
	tags: Record<string, unknown>;
	summary?: SalesItemChangeSummary | null;
}) {
	const [targetActivity] = useQueryState("salesActivity", parseAsInteger);
	const container = useRef<HTMLDivElement>(null);
	const targeted = targetActivity === activityId;
	useEffect(() => {
		if (targeted)
			container.current?.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
	}, [targeted]);
	const status = salesChangeActivityStatus(
		String(tags.changeStatus || "APPROVED"),
		tags.applicationFailed === "true",
	);
	return (
		<div
			ref={container}
			className="mt-2 space-y-2"
			id={`sales-activity-${activityId}`}
		>
			<ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
				{(summary?.messages || ["Sale details updated"]).map(
					(message, index) => (
						<li key={`${activityId}-${index}`}>{message}</li>
					),
				)}
			</ul>
			{status ? <Badge variant="outline">{status}</Badge> : null}
		</div>
	);
}
