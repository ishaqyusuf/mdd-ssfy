"use client";

import { usePageTabs } from "@/components/page-tabs/use-page-tabs";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/custom/confirm-button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { ProjectUnitRow } from "./columns";
import { useProjectUnitsPrintFlow } from "./print-flow";
import { useProjectUnitsTableStore } from "./store";

type Props = {
	data: ProjectUnitRow[];
};

export function BottomBar({ data }: Props) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const pageTabs = usePageTabs();
	const router = useRouter();
	const { startPrint } = useProjectUnitsPrintFlow();
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useProjectUnitsTableStore();
	const selectedUnits = data.filter((item) => rowSelection[String(item.id)]);
	const printableUnits = selectedUnits.flatMap((item) =>
		typeof item.id === "number"
			? [
					{
						id: item.id,
						slug: item.slug,
						lotBlock: item.lotBlock,
						modelName: item.modelName,
					},
				]
			: [],
	);
	const selectedIds = selectedUnits
		.map((item) => item.id)
		.filter((unitId): unitId is number => typeof unitId === "number");
	const selectedCount = selectedIds.length;
	const firstSlug = selectedUnits[0]?.slug;

	const deleteMutation = useMutation(
		trpc.community.deleteUnits.mutationOptions({
			async onSuccess() {
				await queryClient.invalidateQueries({
					queryKey: trpc.community.getProjectUnits.infiniteQueryKey(),
				});
				await pageTabs.invalidate("units");
				setRowSelection({});
			},
		}),
	);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || !selectedCount) {
		return null;
	}

	return createPortal(
		<motion.div
			className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
			initial={{ y: 100 }}
			animate={{ y: 0 }}
			exit={{ y: 100 }}
			transition={{ duration: 0.2, ease: "easeOut" }}
		>
			<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[560px]">
				<motion.div
					className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				/>
				<div className="relative flex h-12 min-w-max items-center justify-between gap-3 pl-4 pr-2">
					<span className="text-sm">{selectedCount} selected</span>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							className="rounded-none"
							disabled={!printableUnits.length}
							onClick={() => startPrint(printableUnits)}
						>
							<Icons.print className="mr-2 size-4" />
							Print selected
						</Button>
						<Button
							variant="ghost"
							className="rounded-none"
							disabled={!firstSlug}
							onClick={() => {
								if (!firstSlug) return;
								router.push(`/community/project-units/${firstSlug}`);
							}}
						>
							<Icons.ExternalLink className="mr-2 size-4" />
							Open first
						</Button>
						<ConfirmBtn
							variant="ghost"
							className="rounded-none"
							trash
							disabled={deleteMutation.isPending}
							onClick={async () => {
								await deleteMutation.mutateAsync({
									unitIds: selectedIds,
								});
							}}
						>
							Delete
						</ConfirmBtn>
						<Button
							variant="ghost"
							className="text-muted-foreground"
							onClick={() => setRowSelection({})}
						>
							<span>Deselect all</span>
						</Button>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
