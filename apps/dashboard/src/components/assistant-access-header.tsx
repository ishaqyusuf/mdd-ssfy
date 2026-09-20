"use client";

import { Input } from "@gnd/ui/input";
import { Search } from "lucide-react";

type Props = {
	search: string;
	onSearchChange: (value: string) => void;
};

export function AssistantAccessHeader({ search, onSearchChange }: Props) {
	return (
		<div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<h2 className="text-lg font-medium">Employee access</h2>
				<p className="text-sm text-muted-foreground">
					Assign Assistant permission directly, or through a role.
				</p>
			</div>
			<div className="relative w-full sm:w-72">
				<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					aria-label="Search employees"
					className="h-9 pl-9"
					placeholder="Search employees..."
					value={search}
					onChange={(event) => onSearchChange(event.target.value)}
				/>
			</div>
		</div>
	);
}
