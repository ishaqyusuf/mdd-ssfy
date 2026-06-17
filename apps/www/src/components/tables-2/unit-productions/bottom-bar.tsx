"use client";

import {
	_completeManyUnitTaskProductions,
	_startManyUnitTaskProductions,
	_stopManyUnitTaskProductions,
} from "@/app-deps/(v1)/_actions/community-production/prod-actions";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useQueryClient } from "@gnd/ui/tanstack";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import type { UnitProductionRow } from "./columns";
import { useUnitProductionsTableStore } from "./store";

type Props = {
	data: UnitProductionRow[];
};

type BatchAction = (ids: number[]) => Promise<void>;

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { rowSelection, setRowSelection } = useUnitProductionsTableStore();
	const selectedItems = data.filter((item) => rowSelection[String(item.id)]);
	const ids = selectedItems.map((item) => item.id);
	const selectedCount = selectedItems.length;

	useEffect(() => {
		setMounted(true);
	}, []);

	async function runAction(action: BatchAction, successMessage: string) {
		await action(ids);
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.community.getUnitProductions.infiniteQueryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.community.getUnitProductionSummary.queryKey(),
			}),
		]);
		setRowSelection({});
		toast.success(successMessage);
	}

	if (!mounted || !selectedCount) return null;

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			<div className="pointer-events-auto relative h-12 min-w-[360px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 items-center justify-between pl-4 pr-2">
					<span className="text-sm">{selectedCount} selected</span>

					<div className="flex items-center space-x-2">
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							<span>Deselect all</span>
						</Button>

						<Button
							variant="ghost"
							className="text-sky-700"
							onClick={() =>
								runAction(
									_startManyUnitTaskProductions,
									`Started ${ids.length} production task${
										ids.length !== 1 ? "s" : ""
									}`,
								)
							}
						>
							<Icons.Play className="mr-2 size-4" />
							Start
						</Button>
						<Button
							variant="ghost"
							className="text-red-700"
							onClick={() =>
								runAction(
									_stopManyUnitTaskProductions,
									`Stopped ${ids.length} production task${
										ids.length !== 1 ? "s" : ""
									}`,
								)
							}
						>
							<Icons.StopCircle className="mr-2 size-4" />
							Stop
						</Button>
						<Button
							variant="ghost"
							className="text-emerald-700"
							onClick={() =>
								runAction(
									_completeManyUnitTaskProductions,
									`Completed ${ids.length} production task${
										ids.length !== 1 ? "s" : ""
									}`,
								)
							}
						>
							<Icons.Check className="mr-2 size-4" />
							Complete
						</Button>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
