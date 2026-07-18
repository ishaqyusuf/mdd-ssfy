"use client";

import { updateProjectArchivedAction } from "@/actions/community/project-actions";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import type { CommunityProjectRow } from "./columns";
import { useCommunityProjectsTableStore } from "./store";

type Props = {
	data: CommunityProjectRow[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const { rowSelection, setRowSelection } = useCommunityProjectsTableStore();
	const selectedIds = data
		.filter((item) => rowSelection[String(item.id)])
		.map((item) => item.id);
	const selectedCount = selectedIds.length;

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
			<div className="pointer-events-auto relative h-12 max-w-[calc(100vw-1rem)] overflow-x-auto scrollbar-hide sm:min-w-[500px]">
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
						<BatchArchiveButton
							projectIds={selectedIds}
							archived={false}
							label="Mark active"
							icon={Icons.CheckCheck}
							onDone={() => setRowSelection({})}
						/>
						<BatchArchiveButton
							projectIds={selectedIds}
							archived={true}
							label="Archive"
							icon={Icons.Archive}
							onDone={() => setRowSelection({})}
						/>
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

function BatchArchiveButton({
	projectIds,
	archived,
	label,
	icon: Icon,
	onDone,
}: {
	projectIds: number[];
	archived: boolean;
	label: string;
	icon: typeof Icons.Archive;
	onDone: () => void;
}) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	return (
		<Button
			variant="ghost"
			className="rounded-none"
			disabled={isPending}
			onClick={() => {
				startTransition(async () => {
					await updateProjectArchivedAction({
						projectIds,
						archived,
					});
					router.refresh();
					onDone();
				});
			}}
		>
			<Icon className="mr-2 size-4" />
			{label}
		</Button>
	);
}
