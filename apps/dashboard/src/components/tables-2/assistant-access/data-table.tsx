"use client";

import { AssistantAccessHeader } from "@/components/assistant-access-header";
import { useTRPC } from "@/trpc/client";
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
import { useState } from "react";
import { type AssistantAccessTableMeta, columns } from "./columns";
import { EmptyState } from "./empty-states";

export function AssistantAccessDataTable() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const { data } = useSuspenseQuery(
		trpc.assistant.adminPermissions.queryOptions({ take: 100 }),
	);
	const update = useMutation(
		trpc.assistant.updateDirectPermission.mutationOptions({
			async onSuccess() {
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.assistant.adminPermissions.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.assistant.bootstrap.queryKey(),
					}),
				]);
				toast({ title: "Assistant permission updated", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to update Assistant permission",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const table = useReactTable({
		data,
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
			onAccessChange: (row, enabled) =>
				update.mutate({ userId: row.id, enabled }),
		} satisfies AssistantAccessTableMeta,
	});
	return (
		<div className="space-y-4">
			<AssistantAccessHeader search={search} onSearchChange={setSearch} />
			<div className="overflow-x-auto">
				<Table className="min-w-[650px]">
					<TableHeader>
						{table.getHeaderGroups().map((group) => (
							<TableRow key={group.id}>
								{group.headers.map((header) => (
									<TableHead key={header.id}>
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
							<TableRow key={row.id}>
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
			<p className="text-xs text-muted-foreground">
				Role access is managed in the role editor. The switch changes only the
				employee's direct permission.
			</p>
		</div>
	);
}
