"use client";

import type { Row } from "@tanstack/react-table";
import type { Virtualizer } from "@tanstack/react-virtual";
import type { ReactNode, RefObject } from "react";

export function VirtualRecordList<T>({
	rows,
	virtualizer,
	scrollRef,
	renderRow,
	height = "min(560px, 65vh)",
}: {
	rows: Row<T>[];
	virtualizer: Virtualizer<HTMLDivElement, Element>;
	scrollRef: RefObject<HTMLDivElement | null>;
	renderRow: (row: Row<T>) => ReactNode;
	height?: string;
}) {
	return (
		<div
			ref={scrollRef}
			className="min-w-0 overflow-auto overscroll-contain rounded-xl border bg-card"
			style={{ height: `min(${virtualizer.getTotalSize()}px, ${height})` }}
		>
			<ul
				className="relative w-full"
				style={{ height: virtualizer.getTotalSize() }}
			>
				{virtualizer.getVirtualItems().map((item) => {
					const row = rows[item.index];
					if (!row) return null;
					return (
						<li
							key={row.id}
							data-index={item.index}
							ref={virtualizer.measureElement}
							className="absolute left-0 top-0 w-full border-b last:border-b-0"
							style={{ transform: `translateY(${item.start}px)` }}
						>
							{renderRow(row)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
