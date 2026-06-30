"use client";

import { Button } from "@gnd/ui/button";
import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	description: ReactNode;
	actionLabel: string;
	onAction: () => void;
}

export function EmptyState({
	title,
	description,
	actionLabel,
	onAction,
}: EmptyStateProps) {
	return (
		<div className="flex items-center justify-center">
			<div className="mt-40 flex flex-col items-center">
				<div className="mb-6 space-y-2 text-center">
					<h2 className="text-lg font-medium">{title}</h2>
					<p className="text-sm text-[#606060]">{description}</p>
				</div>

				<Button variant="outline" onClick={onAction}>
					{actionLabel}
				</Button>
			</div>
		</div>
	);
}

interface NoResultsProps {
	onClear: () => void;
}

export function NoResults({ onClear }: NoResultsProps) {
	return (
		<EmptyState
			title="No results"
			description="Try another search, or adjusting the filters"
			actionLabel="Clear filters"
			onAction={onClear}
		/>
	);
}
