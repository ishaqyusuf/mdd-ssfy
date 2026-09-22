/** @jsxImportSource react */
"use client";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@gnd/ui/collapsible";
import { ChevronDown } from "lucide-react";

export function CustomerRequestText({ text }: { text?: string | null }) {
	if (!text) return null;
	return (
		<Collapsible className="rounded-lg border">
			<CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 p-4 text-left text-sm font-medium">
				Customer request text
				<ChevronDown className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
			</CollapsibleTrigger>
			<CollapsibleContent>
				<p className="px-4 pb-2 text-xs text-muted-foreground">
					Original text used to generate this order. Compare items and quantities before confirming.
				</p>
				<pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words px-4 pb-4 font-sans text-sm">
					{text}
				</pre>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function CustomerRequestReview({
	review,
	lineItems,
}: {
	review?: { lineUid: string | null; reason: string }[] | null;
	lineItems: { uid: string }[];
}) {
	if (!review?.length) return null;
	return (
		<section className="rounded-lg border p-4" aria-label="Sales request needs review">
			<h3 className="text-sm font-medium">Needs review ({review.length})</h3>
			<p className="mt-1 text-xs text-muted-foreground">
				Compare these details with the original request and finish them before confirming.
			</p>
			<ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
				{review.map((item, index) => {
					const lineIndex = lineItems.findIndex((line) => line.uid === item.lineUid);
					return (
						<li key={`${item.lineUid}:${index}`} className="border-t pt-2 first:border-t-0 first:pt-0">
							<span className="font-medium">
								{lineIndex >= 0 ? `Item ${lineIndex + 1}: ` : "Request: "}
							</span>
							{item.reason}
						</li>
					);
				})}
			</ul>
		</section>
	);
}
