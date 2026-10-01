import type { Row } from "@tanstack/react-table";
import type { ReactNode } from "react";

export function RecordList<T>({
	rows,
	renderRow,
}: {
	rows: Row<T>[];
	renderRow: (row: Row<T>) => ReactNode;
}) {
	return (
		<ul className="min-w-0 divide-y rounded-xl border bg-card">
			{rows.map((row) => (
				<li key={row.id}>{renderRow(row)}</li>
			))}
		</ul>
	);
}
