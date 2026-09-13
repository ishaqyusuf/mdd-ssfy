"use client";

import { AssistantAccessHeader } from "@/components/assistant-access-header";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@gnd/ui/table";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
	type AssistantAccessRow,
	type AssistantAccessTableMeta,
	columns,
	isActive,
} from "./columns";
import { EmptyState } from "./empty-states";

export function AssistantAccessDataTable() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<AssistantAccessRow | null>(null);
	const [nextEnabled, setNextEnabled] = useState(false);
	const [expiresAt, setExpiresAt] = useState("");
	const [reason, setReason] = useState("");
	const { data } = useSuspenseQuery(
		trpc.assistant.adminEntitlements.queryOptions({ take: 100 }),
	);
	const rows = useMemo(() => data ?? [], [data]);
	const update = useMutation(
		trpc.assistant.updateEntitlement.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.assistant.adminEntitlements.queryKey(),
				});
				setSelected(null);
				toast({ title: "Assistant access updated", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to update Assistant access",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	function openEditor(row: AssistantAccessRow, enabled: boolean) {
		setSelected(row);
		setNextEnabled(enabled);
		setExpiresAt(
			row.assistantEntitlement?.expiresAt
				? toLocalDateTime(row.assistantEntitlement.expiresAt)
				: "",
		);
		setReason("");
	}

	const table = useReactTable({
		data: rows,
		columns,
		getRowId: (row) => String(row.id),
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		state: { globalFilter: search },
		onGlobalFilterChange: setSearch,
		globalFilterFn: (row, _columnId, value) => {
			const term = String(value).trim().toLowerCase();
			return [row.original.name, row.original.email].some((field) =>
				field?.toLowerCase().includes(term),
			);
		},
		meta: {
			isUpdating: update.isPending,
			onAccessChange: openEditor,
		} satisfies AssistantAccessTableMeta,
	});
	const enabledCount = rows.filter(isActive).length;
	const expiringCount = rows.filter(
		(row) => row.assistantEntitlement?.expiresAt,
	).length;

	return (
		<div className="space-y-6">
			<div className="grid gap-4 sm:grid-cols-3">
				<Summary
					label="Enabled accounts"
					value={enabledCount}
					detail="Individual access"
				/>
				<Summary
					label="Scheduled expiry"
					value={expiringCount}
					detail="Temporary access"
				/>
				<Summary
					label="Employee accounts"
					value={rows.length}
					detail="Loaded from the database"
				/>
			</div>

			<AssistantAccessHeader search={search} onSearchChange={setSearch} />

			<div className="overflow-x-auto">
				<Table className="min-w-[850px]">
					<TableHeader className="bg-sidebar-accent">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="hover:bg-transparent">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className="h-11 text-[11px] uppercase text-slate-600 dark:text-slate-300"
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.map((row) => (
							<TableRow key={row.id} className="h-16">
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
				{table.getRowModel().rows.length === 0 ? (
					<EmptyState hasSearch={Boolean(search.trim())} />
				) : null}
			</div>

			<Dialog
				open={Boolean(selected)}
				onOpenChange={(open) => !open && setSelected(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{nextEnabled ? "Enable" : "Disable"} Assistant access
						</DialogTitle>
						<DialogDescription>
							This changes product access for{" "}
							{selected?.name || selected?.email}.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-2">
						{nextEnabled ? (
							<label
								className="grid gap-2 text-sm"
								htmlFor="assistant-access-expiry"
							>
								<span className="font-medium">Expiry (optional)</span>
								<Input
									id="assistant-access-expiry"
									type="datetime-local"
									value={expiresAt}
									onChange={(event) => setExpiresAt(event.target.value)}
								/>
							</label>
						) : null}
						{nextEnabled ? null : (
							<label
								className="grid gap-2 text-sm"
								htmlFor="assistant-access-reason"
							>
								<span className="font-medium">Reason</span>
								<Input
									id="assistant-access-reason"
									placeholder="Required for the audit history"
									value={reason}
									onChange={(event) => setReason(event.target.value)}
								/>
							</label>
						)}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setSelected(null)}>
							Cancel
						</Button>
						<Button
							disabled={
								(!nextEnabled && reason.trim().length < 3) || update.isPending
							}
							onClick={() =>
								selected &&
								update.mutate({
									userId: selected.id,
									enabled: nextEnabled,
									expiresAt: expiresAt ? new Date(expiresAt) : null,
									reason: nextEnabled
										? "Enabled by Super Admin"
										: reason.trim(),
									expectedVersion: selected.assistantEntitlement?.version ?? 0,
								})
							}
						>
							Save access
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

function Summary({
	label,
	value,
	detail,
}: { label: string; value: number; detail: string }) {
	return (
		<div className="rounded-lg border bg-background p-4">
			<p className="text-sm text-muted-foreground">{label}</p>
			<p className="mt-2 text-3xl font-semibold">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{detail}</p>
		</div>
	);
}

function toLocalDateTime(value: Date | string) {
	const date = new Date(value);
	return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
		.toISOString()
		.slice(0, 16);
}
