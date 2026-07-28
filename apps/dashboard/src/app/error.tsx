"use client";

import { Button } from "@gnd/ui/button";
import { useEffect } from "react";

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		if (process.env.NODE_ENV === "production") {
			import("@sentry/nextjs").then((Sentry) => {
				Sentry.captureException(error);
			});
		}
	}, [error]);

	return (
		<div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
			<div className="w-full max-w-md px-4 text-center">
				<h2 className="mb-4 font-medium">Something went wrong</h2>
				<p className="mb-6 text-sm text-muted-foreground">
					We&apos;ve been notified and are looking into it. Please try again.
				</p>

				{error.digest ? (
					<p className="mt-4 text-xs text-muted-foreground">
						Error ID: {error.digest}
					</p>
				) : null}

				<Button className="mt-6" onClick={reset} variant="outline">
					Try again
				</Button>
			</div>
		</div>
	);
}
