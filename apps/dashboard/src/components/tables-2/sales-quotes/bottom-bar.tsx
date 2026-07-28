"use client";

import { SalesMenu } from "@/components/sales-menu";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/custom/confirm-button";
import { Icons } from "@gnd/ui/icons";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { SalesQuote } from "./columns";
import { useSalesQuotesTableStore } from "./store";

type Props = {
	data: SalesQuote[];
};

export function BottomBar({ data }: Props) {
	const [mounted, setMounted] = useState(false);
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { rowSelection, setRowSelection } = useSalesQuotesTableStore();
	const selectedQuotes = data.filter((quote) => rowSelection[quote.uuid]);
	const salesIds = selectedQuotes.map((quote) => quote.id);
	const orderIds = selectedQuotes.map((quote) => quote.orderId);
	const selectedCount = Object.keys(rowSelection).length;

	const deleteMutation = useMutation(
		trpc.sales.deleteSalesByOrderIds.mutationOptions({
			async onSuccess() {
				setRowSelection({});
				await queryClient.invalidateQueries({
					queryKey: trpc.sales.quotes.infiniteQueryKey(),
				});
			},
		}),
	);

	useEffect(() => {
		setMounted(true);
	}, []);

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

						<SalesMenu
							type="quote"
							salesIds={salesIds}
							trigger={
								<Button variant="ghost">
									<Icons.print className="mr-2 size-4" />
									Print
								</Button>
							}
						>
							<SalesMenu.SalesPrintMenuItems />
						</SalesMenu>

						<SalesMenu
							type="quote"
							salesIds={salesIds}
							trigger={
								<Button variant="ghost">
									<Icons.Email className="mr-2 size-4" />
									Email
								</Button>
							}
						>
							<SalesMenu.QuoteEmailMenuItems />
						</SalesMenu>

						<ConfirmBtn
							variant="ghost"
							trash
							className="text-red-600"
							disabled={!orderIds.length || deleteMutation.isPending}
							isDeleting={deleteMutation.isPending}
							onClick={async () => {
								await deleteMutation.mutateAsync({
									orderIds,
								});
							}}
						>
							Delete
						</ConfirmBtn>
					</div>
				</div>
			</div>
		</motion.div>,
		document.body,
	);
}
