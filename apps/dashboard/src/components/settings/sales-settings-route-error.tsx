"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useEffect } from "react";

export function SalesSettingsRouteError({
	title,
	error,
	reset,
}: {
	title: string;
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<section role="alert" className="rounded-md border bg-background p-6">
			<div className="flex items-start gap-3">
				<Icons.AlertCircle className="mt-0.5 size-5 text-destructive" />
				<div>
					<h1 className="font-semibold">{title}</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						This settings section could not be loaded. Try the request again.
					</p>
					<Button className="mt-4" variant="outline" onClick={reset}>
						Try again
					</Button>
				</div>
			</div>
		</section>
	);
}
