"use client";

import { classifyError, getErrorPresentation } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import { useEffect, useMemo } from "react";

export function ErrorFallback({ error }: { error: unknown }) {
	const classified = useMemo(() => classifyError(error), [error]);
	const presentation = getErrorPresentation(classified);
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		const report = buildErrorReport(classified, {
			runtime: "dealership",
			source: "react-error-boundary",
		});
		if (!report.classified.reportable) return;
		void import("@sentry/nextjs").then((Sentry) => {
			Sentry.captureException(report.reportableError, report.captureContext);
		});
	}, [classified]);
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
			<p className="font-medium text-destructive">{presentation.title}</p>
			<p className="mt-1 text-muted-foreground">{presentation.description}</p>
			<p className="mt-2 text-xs text-muted-foreground">
				{presentation.reference}
			</p>
		</div>
	);
}
