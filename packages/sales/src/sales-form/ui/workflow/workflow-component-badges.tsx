/** @jsxImportSource react */
"use client";

import { Icons } from "@gnd/ui/icons";

export type WorkflowComponentBadgesProps = {
	isDefault?: boolean;
	hasVariations?: boolean;
	hasSectionOverride?: boolean;
	hasRedirect?: boolean;
};

export function WorkflowComponentBadges(props: WorkflowComponentBadgesProps) {
	if (
		!props.isDefault &&
		!props.hasVariations &&
		!props.hasSectionOverride &&
		!props.hasRedirect
	) {
		return null;
	}

	return (
		<div className="absolute left-2 top-2 z-[2] flex flex-col gap-1">
			{props.isDefault ? (
				<span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
					Default
				</span>
			) : null}
			{props.hasVariations ? (
				<span className="rounded bg-secondary p-1">
					<Icons.Filter className="size-3 text-muted-foreground" />
				</span>
			) : null}
			{props.hasSectionOverride ? (
				<span className="rounded bg-secondary p-1">
					<Icons.LucideVariable className="size-3 text-muted-foreground" />
				</span>
			) : null}
			{props.hasRedirect ? (
				<span className="rounded bg-secondary p-1">
					<Icons.ExternalLink className="size-3 text-muted-foreground" />
				</span>
			) : null}
		</div>
	);
}
