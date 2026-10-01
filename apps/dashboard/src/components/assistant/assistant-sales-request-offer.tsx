"use client";

import { Button } from "@gnd/ui/button";

export function AssistantSalesRequestOfferCard({
	disabled,
	onCreate,
	onDismiss,
}: {
	disabled: boolean;
	onCreate: () => void;
	onDismiss: () => void;
}) {
	return (
		<section
			className="mx-auto w-full max-w-3xl rounded-lg border bg-background p-4"
			aria-label="Create a sales request"
		>
			<p className="text-sm font-medium">
				Would you like to create a sales request from this?
			</p>
			<p className="mt-1 text-sm text-muted-foreground">
				Use the original request to prepare a draft for review. Click below or
				reply “yes”.
			</p>
			<div className="mt-3 flex flex-wrap gap-2">
				<Button size="sm" disabled={disabled} onClick={onCreate}>
					Create sales request
				</Button>
				<Button
					size="sm"
					variant="ghost"
					disabled={disabled}
					onClick={onDismiss}
				>
					Not now
				</Button>
			</div>
		</section>
	);
}
