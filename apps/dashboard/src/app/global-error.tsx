"use client";

import { classifyError, getErrorPresentation } from "@gnd/errors";
import { buildErrorReport } from "@gnd/observability";
import { useEffect, useMemo } from "react";

export default function GlobalError({
	error,
}: {
	error: Error & { digest?: string };
}) {
	const classified = useMemo(() => classifyError(error), [error]);
	const presentation = getErrorPresentation(classified);

	useEffect(() => {
		if (process.env.NODE_ENV === "production") {
			const report = buildErrorReport(classified, {
				runtime: "dashboard",
				source: "next-global-error-boundary",
			});
			if (!report.classified.reportable) return;
			import("@sentry/nextjs").then((Sentry) => {
				Sentry.captureException(report.reportableError, report.captureContext);
			});
		}
	}, [classified]);

	return (
		<html lang="en">
			<body>
				<main
					style={{
						fontFamily: "sans-serif",
						margin: "15vh auto",
						maxWidth: 520,
						padding: 24,
						textAlign: "center",
					}}
				>
					<h1>{presentation.title}</h1>
					<p>{presentation.description}</p>
					<p style={{ fontSize: 12 }}>{presentation.reference}</p>
				</main>
			</body>
		</html>
	);
}
