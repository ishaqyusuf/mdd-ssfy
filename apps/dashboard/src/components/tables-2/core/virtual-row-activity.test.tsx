import { expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { VirtualRow } from "./virtual-row";
import type { RowPresentation } from "@/lib/table-row-activity/compose";

function Harness({ activity }: { activity?: RowPresentation }) {
	const table = useReactTable({
		data: [{ id: "one" }],
		columns: [
			{ accessorKey: "id", cell: () => <button type="button">Open</button> },
		],
		getCoreRowModel: getCoreRowModel(),
		getRowId: (row) => row.id,
	});
	return (
		<table>
			<tbody>
				<VirtualRow
					row={table.getRowModel().rows[0]!}
					virtualStart={112}
					rowHeight={56}
					getStickyStyle={() => ({ position: "sticky", left: 0 })}
					getStickyClassName={() => "bg-background"}
					activity={activity}
					activityLabelColumnId="id"
				/>
			</tbody>
		</table>
	);
}
it("renders retained success as inert while preserving virtual positioning", () => {
	const html = renderToStaticMarkup(
		<Harness
			activity={{
				phase: "success",
				label: "Reviewed",
				retained: true,
				exiting: true,
				interactionDisabled: true,
			}}
		/>,
	);
	expect(html).toContain('inert=""');
	expect(html).toContain('aria-label="Reviewed"');
	expect(html).toContain("translateY(112px)");
	expect(html).toContain("opacity:0");
	expect(html).toContain("!bg-emerald-100");
	expect(html).toContain('<div hidden="" class="hidden"><button type="button">Open</button></div>');
	expect(renderToStaticMarkup(<Harness />)).not.toContain('inert=""');
});
