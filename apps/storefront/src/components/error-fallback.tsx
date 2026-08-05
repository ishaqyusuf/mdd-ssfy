"use client";

import { classifyError, getErrorPresentation } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import { Button } from "@gnd/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export function ErrorFallback({ error }: { error?: unknown }) {
	const router = useRouter();
	const classified = useMemo(
		() => classifyError(error ?? new Error("Page failed to load")),
		[error],
	);
	const presentation = getErrorPresentation(classified);

	useEffect(() => {
		if (!error || process.env.NODE_ENV !== "production") return;
		const report = buildErrorReport(classified, {
			runtime: "storefront",
			source: "react-error-boundary",
		});
		if (!report.classified.reportable) return;
		void import("@sentry/nextjs").then((Sentry) => {
			Sentry.captureException(report.reportableError, report.captureContext);
		});
	}, [classified, error]);

	return (
		<div className="flex flex-col items-center justify-center h-full space-y-4">
			<div>
				<h2 className="text-md font-medium">{presentation.title}</h2>
				<p className="mt-1 text-sm text-muted-foreground">
					{presentation.description}
				</p>
				<p className="mt-2 text-xs text-muted-foreground">
					{presentation.reference}
				</p>
			</div>
			<Button onClick={() => router.refresh()} variant="outline">
				Try again
			</Button>
		</div>
	);
}
