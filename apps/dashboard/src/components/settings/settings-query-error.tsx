"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function SettingsQueryError({
	title,
	description,
	onRetry,
}: {
	title: string;
	description: string;
	onRetry: () => void;
}) {
	return (
		<div role="alert" className="rounded-md border bg-background p-6">
			<div className="flex items-start gap-3">
				<Icons.AlertCircle className="mt-0.5 size-5 text-destructive" />
				<div className="flex-1">
					<h2 className="font-semibold">{title}</h2>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						{description}
					</p>
					<Button className="mt-4" variant="outline" onClick={onRetry}>
						Try again
					</Button>
				</div>
			</div>
		</div>
	);
}
