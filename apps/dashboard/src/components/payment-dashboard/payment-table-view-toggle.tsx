"use client";

import { Button } from "@gnd/ui/button";

export function PaymentTableViewToggle({
	tableView,
	onChange,
}: { tableView: boolean; onChange: (value: boolean) => void }) {
	return (
		<div className="mb-3 flex justify-end">
			<Button
				variant="ghost"
				size="sm"
				aria-pressed={tableView}
				onClick={() => onChange(!tableView)}
			>
				{tableView ? "Show records" : "Table view"}
			</Button>
		</div>
	);
}
