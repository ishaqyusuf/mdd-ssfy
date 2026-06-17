"use client";

import { useDriversList } from "@/hooks/use-data-list";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/custom/confirm-button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { SalesDispatch } from "./columns";
import { useSalesDispatchTableStore } from "./store";

type Props = {
	data: SalesDispatch[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useSalesDispatchTableStore();
	const selectedDispatches = data.filter(
		(dispatch) => rowSelection[String(dispatch.id)],
	);
	const selectedIds = selectedDispatches
		.map((dispatch) => dispatch.id)
		.filter((id): id is number => typeof id === "number");
	const selectedCount = selectedIds.length;

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !selectedCount) return null;

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex justify-center px-3"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			<div className="pointer-events-auto relative h-12 w-[calc(100vw-1.5rem)] max-w-[560px] sm:min-w-[420px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 items-center justify-between gap-3 overflow-x-auto pl-4 pr-2">
					<span className="shrink-0 text-sm">{selectedCount} selected</span>

					<div className="flex shrink-0 items-center gap-2">
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							<span>Deselect all</span>
						</Button>
						<BulkAssignDriver
							selectedIds={selectedIds}
							onDone={() => setRowSelection({})}
						/>
						<BulkCancel
							selectedIds={selectedIds}
							onDone={() => setRowSelection({})}
						/>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}

function BulkAssignDriver({
	selectedIds,
	onDone,
}: {
	selectedIds: number[];
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const drivers = useDriversList(true);
	const bulkAssign = useMutation(
		trpc.dispatch.bulkAssignDriver.mutationOptions({
			onSuccess(data) {
				toast({
					variant: "success",
					title: `Assigned ${data.updated} dispatch${
						data.updated !== 1 ? "es" : ""
					}`,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.dispatchSummary.queryKey(),
				});
				onDone();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Bulk assign failed",
					description: error.message,
				});
			},
		}),
	);

	return (
		<Menu
			Trigger={
				<Button
					variant="ghost"
					disabled={bulkAssign.isPending || !selectedIds.length}
				>
					{bulkAssign.isPending ? (
						<Icons.Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						<Icons.UserCheck className="mr-2 size-4" />
					)}
					Assign
				</Button>
			}
		>
			{drivers.length ? (
				drivers.map((driver) => (
					<Menu.Item
						key={driver.id}
						onClick={() =>
							bulkAssign.mutate({
								dispatchIds: selectedIds,
								newDriverId: driver.id,
							})
						}
					>
						{driver.name}
					</Menu.Item>
				))
			) : (
				<Menu.Item disabled>No drivers found</Menu.Item>
			)}
			<Menu.Item
				className="text-muted-foreground"
				onClick={() =>
					bulkAssign.mutate({
						dispatchIds: selectedIds,
						newDriverId: null,
					})
				}
			>
				Unassign driver
			</Menu.Item>
		</Menu>
	);
}

function BulkCancel({
	selectedIds,
	onDone,
}: {
	selectedIds: number[];
	onDone: () => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const bulkCancel = useMutation(
		trpc.dispatch.bulkCancel.mutationOptions({
			onSuccess(data) {
				toast({
					variant: "success",
					title: `Cancelled ${data.cancelled} dispatch${
						data.cancelled !== 1 ? "es" : ""
					}`,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.index.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.assignedDispatch.pathKey(),
				});
				queryClient.invalidateQueries({
					queryKey: trpc.dispatch.dispatchSummary.queryKey(),
				});
				onDone();
			},
			onError(error) {
				toast({
					variant: "error",
					title: "Bulk cancel failed",
					description: error.message,
				});
			},
		}),
	);

	return (
		<ConfirmBtn
			variant="ghost"
			className="text-red-600 hover:text-red-700"
			disabled={bulkCancel.isPending || !selectedIds.length}
			isDeleting={bulkCancel.isPending}
			onClick={() => bulkCancel.mutate({ dispatchIds: selectedIds })}
		>
			Cancel
		</ConfirmBtn>
	);
}
