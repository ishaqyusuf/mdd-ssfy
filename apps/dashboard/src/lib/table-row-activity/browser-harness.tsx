import { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync, createPortal } from "react-dom";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTableRowsWithActivity } from "@/hooks/use-table-rows-with-activity";
import { VirtualRow } from "@/components/tables-2/core/virtual-row";
import { tableRowActivity } from "@/store/table-row-activity";

type Row = { id: number; uuid: string; title: string };
const initial: Row[] = [
	{ id: 1, uuid: "fixture-one", title: "Fixture One" },
	{ id: 2, uuid: "fixture-two", title: "Fixture Two" },
];
const getEntityId = (row: Row) => row.id;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const portalEvents = { clicks: 0, keys: 0 };
function PortalAction({ id }: { id: number }) {
	return createPortal(
		<button
			type="button"
			data-fixture-portal={id}
			onClick={() => {
				portalEvents.clicks++;
			}}
			onKeyDown={() => {
				portalEvents.keys++;
			}}
		>
			Portal fixture {id}
		</button>,
		document.body,
	);
}
const columns = [
	{ accessorKey: "title" },
	{
		id: "actions",
		cell: ({ row }: { row: { original: Row } }) => (
			<PortalAction id={row.original.id} />
		),
	},
	{ id: "status", cell: () => <button type="button">Open fixture</button> },
];
function Harness() {
	const [rows, setRows] = useState(initial);
	const [scope, setScope] = useState("A");
	const [refresh, setRefresh] = useState<{
		completedAt: number;
		entityIds: Set<number>;
	}>();
	const [result, setResult] = useState("Ready");
	const [running, setRunning] = useState(false);
	const parent = useRef<HTMLDivElement>(null);
	const committed = useRef<string[]>([]);
	const view = useTableRowsWithActivity({
		serverRows: rows,
		ownerId: "browser-fixture",
		tableId: "fixture",
		scopeKey: scope,
		refresh,
		getEntityId,
		onCommitted: (row) => {
			committed.current.push(row.uuid);
		},
		onCapture: () => {
			if (parent.current?.contains(document.activeElement))
				parent.current.focus();
		},
	});
	const table = useReactTable({
		data: view.displayRows,
		columns,
		getRowId: (row) => row.uuid,
		getCoreRowModel: getCoreRowModel(),
	});
	const begin = (id = 1) =>
		tableRowActivity.begin({
			ownerId: "browser-fixture",
			tableId: "fixture",
			entityId: id,
			label: "Processing fixture",
		});
	const row = (id = "fixture-one") =>
		document.querySelector<HTMLElement>(`[data-row-key="${id}"]`);
	async function run() {
		const checks: string[] = [];
		const check = (condition: unknown, label: string) => {
			if (!condition) throw new Error(label);
			checks.push(`PASS ${label}`);
		};
		setRunning(true);
		try {
			tableRowActivity.clearOwner("browser-fixture");
			flushSync(() => {
				setRows(initial);
				setScope("A");
				setRefresh(undefined);
			});
			const portal = () =>
				document.querySelector<HTMLButtonElement>('[data-fixture-portal="1"]');
			portalEvents.clicks = 0;
			portalEvents.keys = 0;
			portal()?.click();
			check(
				portalEvents.clicks === 1,
				"portaled control is actionable before processing",
			);
			row()?.querySelector<HTMLButtonElement>("button")?.focus();
			const statusControl = row()?.querySelector<HTMLButtonElement>("button");
			let token = begin();
			check(
				document.activeElement === parent.current,
				"capture moves row focus to stable table target",
			);
			await pause(20);
			check(row()?.dataset.rowActivity === "processing", "processing renders");
			check(row()?.inert, "processing controls are inert");
			check(
				statusControl && row()?.contains(statusControl),
				"status action stays mounted while feedback is displayed",
			);
			portal()?.click();
			portal()?.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
			portal()?.dispatchEvent(
				new KeyboardEvent("keydown", { key: " ", bubbles: true }),
			);
			check(
				portalEvents.clicks === 1 && portalEvents.keys === 0,
				"row capture blocks portaled click and keyboard actions",
			);
			flushSync(() => {
				tableRowActivity.settle(token, {
					phase: "success",
					label: "Completed fixture",
				});
				setRows([initial[1]!]);
				setRefresh({ completedAt: Date.now(), entityIds: new Set([2]) });
			});
			check(
				row()?.dataset.rowActivity === "success",
				"departing row survives same-frame success and refresh",
			);
			flushSync(() => setScope("B"));
			check(!row(), "scope change removes retained row immediately");
			flushSync(() => setScope("A"));
			check(!row(), "returning to a view does not replay success");
			tableRowActivity.clearOwner("browser-fixture");
			flushSync(() => {
				setRows(initial);
				setRefresh(undefined);
			});
			token = begin();
			flushSync(() =>
				tableRowActivity.settle(token, {
					phase: "error",
					label: "Failed fixture",
				}),
			);
			check(
				row()?.dataset.rowActivity === "error" && !row()?.inert,
				"failed row remains retryable",
			);
			portal()?.click();
			check(
				portalEvents.clicks === 2,
				"failed row restores portaled interaction",
			);
			const retry = begin();
			tableRowActivity.settle(token, {
				phase: "success",
				label: "Stale completion",
			});
			await pause(20);
			check(
				row()?.dataset.rowActivity === "processing",
				"old completion cannot overwrite retry",
			);
			flushSync(() => {
				tableRowActivity.settle(retry, {
					phase: "success",
					label: "Completed fixture",
				});
				setRows([]);
				setRefresh({ completedAt: Date.now(), entityIds: new Set() });
			});
			check(Boolean(row()), "final row stays before empty state");
			const presented = performance.now();
			await pause(1650);
			check(row()?.style.opacity === "0", "fade begins after success dwell");
			await pause(260);
			check(
				!row() && document.body.textContent?.includes("No fixture rows"),
				"expiry reaches empty state without transitionend",
			);
			tableRowActivity.clearOwner("browser-fixture");
			flushSync(() => {
				setRows(initial);
				setRefresh(undefined);
			});
			committed.current = [];
			token = begin();
			flushSync(() => setRows([]));
			flushSync(() =>
				tableRowActivity.settle(token, {
					phase: "success",
					label: "Committed while absent",
				}),
			);
			check(
				committed.current.join(",") === "fixture-one",
				"absent captured success delivers selection cleanup without refresh proof",
			);
			checks.push(
				`Visible dwell and exit checked over ${Math.round(performance.now() - presented)}ms`,
			);
			setResult(checks.join("\n"));
		} catch (error) {
			setResult([...checks, `FAIL ${String(error)}`].join("\n"));
		} finally {
			setRunning(false);
		}
	}
	return (
		<main>
			<h1>Row feedback verification</h1>
			<p>Synthetic rows only; no business data or APIs.</p>
			<button type="button" disabled={running} onClick={run}>
				Run lifecycle checks
			</button>
			<button
				type="button"
				onClick={() => document.body.classList.toggle("dark")}
			>
				Toggle fixture dark mode
			</button>
			<div
				ref={parent}
				tabIndex={-1}
				className="fixture"
				aria-label="Fixture table"
			>
				{view.displayRows.length ? (
					<table>
						<tbody>
							{table.getRowModel().rows.map((entry, index) => (
								<VirtualRow
									key={entry.id}
									row={entry}
									virtualStart={index * 56}
									rowHeight={56}
									getStickyStyle={() => ({})}
									getStickyClassName={() => "bg-background"}
									activity={view.presentationById.get(entry.original.id)}
									activityLabelColumnId="status"
								/>
							))}
						</tbody>
					</table>
				) : (
					<p>No fixture rows</p>
				)}
			</div>
			<pre role="status">{result}</pre>
		</main>
	);
}
createRoot(document.getElementById("root")!).render(<Harness />);
