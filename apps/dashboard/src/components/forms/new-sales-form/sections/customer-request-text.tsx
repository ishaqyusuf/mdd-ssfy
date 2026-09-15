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
