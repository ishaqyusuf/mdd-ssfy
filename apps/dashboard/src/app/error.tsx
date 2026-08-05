"use client";

import { classifyError, getErrorPresentation } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import { Button } from "@gnd/ui/button";
import { useEffect, useMemo } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const classified = useMemo(() => classifyError(error), [error]);
	const presentation = getErrorPresentation(classified);

	useEffect(() => {
		if (process.env.NODE_ENV === "production") {
			const report = buildErrorReport(classified, {
				runtime: "dashboard",
				source: "next-error-boundary",
			});
			if (!report.classified.reportable) return;
			import("@sentry/nextjs").then((Sentry) => {
				Sentry.captureException(report.reportableError, report.captureContext);
			});
		}
	}, [classified]);

	return (
		<div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
			<div className="w-full max-w-md px-4 text-center">
				<h2 className="mb-4 font-medium">{presentation.title}</h2>
				<p className="mb-6 text-sm text-muted-foreground">
					{presentation.description}
				</p>
				<p className="mt-4 text-xs text-muted-foreground">
					{presentation.reference}
				</p>

				<Button className="mt-6" onClick={reset} variant="outline">
					Try again
				</Button>
			</div>
		</div>
	);
}
