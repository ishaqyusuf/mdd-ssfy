"use client";
import { useState } from "react";
import { Button } from "@gnd/ui/button";
import type { SaveFailure } from "./save-failure";

export function SaveFailureAlert({
	failure,
	onDismiss,
}: { failure: SaveFailure; onDismiss: () => void }) {
	const [copyStatus, setCopyStatus] = useState("");
	return (
		<section
			role="alert"
			className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
		>
			<p className="font-semibold">
				{failure.saved
					? "Order saved; follow-up needs attention"
					: `${failure.operation} could not complete`}
			</p>
			<p className="mt-1">{failure.message}</p>
			<p className="mt-2 text-xs text-muted-foreground">
				{failure.saved
					? "Your order changes were saved. Do not resubmit them to fix this follow-up failure. Send these details to your administrator."
					: "Keep your edits available until the save is confirmed. Send these details to your administrator if you need help."}
			</p>
			<details className="mt-3">
				<summary className="cursor-pointer font-medium">Error details</summary>
				<pre className="mt-2 whitespace-pre-wrap break-words text-xs">
					{failure.details}
				</pre>
			</details>
			<div className="mt-3 flex items-center gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(failure.details);
							setCopyStatus("Copied");
						} catch {
							setCopyStatus(
								"Copy unavailable. Select the text under Error details.",
							);
						}
					}}
				>
					Copy error details
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={onDismiss}>
					Dismiss
				</Button>
				<span role="status" className="text-xs">
					{copyStatus}
				</span>
			</div>
		</section>
	);
}
