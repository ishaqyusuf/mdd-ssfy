/** @jsxImportSource react */

import type { ReactNode } from "react";

export type SalesFormSummarySectionHeaderProps = {
	title: string;
	description: string;
	icon: ReactNode;
};

export function SalesFormSummarySectionHeader(
	props: SalesFormSummarySectionHeaderProps,
) {
	return (
		<header className="mb-5 flex items-start gap-3">
			<span aria-hidden="true" className="mt-0.5 shrink-0 text-primary">
				{props.icon}
			</span>
			<div className="min-w-0 space-y-0.5">
				<h3 className="text-sm font-semibold text-foreground">{props.title}</h3>
				<p className="text-xs leading-5 text-muted-foreground">
					{props.description}
				</p>
			</div>
		</header>
	);
}
