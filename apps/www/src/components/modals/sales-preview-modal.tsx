"use client";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";

import { ScrollArea } from "@gnd/ui/scroll-area";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { SalesPreview } from "../sales-preview";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";

// export function useSalesPreviewModal() {
//     const [q, setQ] = useQueryStates({
//         salesPreviewSlug: parseAsString,
//         salesPreviewType: parseAsStringEnum(["order", "quote"] as SalesType[]),
//         previewModal: parseAsBoolean,
//     });

//     return {
//         q,
//         isOpened: q.salesPreviewSlug != null && q.previewModal,
//         preview(id, salesPreviewType: typeof q.salesPreviewType) {
//             setQ({
//                 salesPreviewSlug: id,
//                 salesPreviewType,
//                 previewModal: true,
//             });
//         },
//         close() {
//             setQ(null);
//         },
//     };
// }
export function SalesPreviewModal({}) {
	const ctx = useSalesPreview();
	const inboundCtx = useInboundStatusModal();

	return (
		<Dialog
			onOpenChange={() => {
				ctx.close();
				inboundCtx?.setParams(null);
			}}
			open={ctx.opened}
		>
			<DialogContent className="max-w-6xl overflow-hidden gap-0 p-0">
				<DialogHeader className="sr-only">
					<DialogTitle>Sales Preview</DialogTitle>
				</DialogHeader>
				<ScrollArea
					className={cn(
						"h-[90vh] overflow-auto",
						!inboundCtx?.params?.inboundOrderId || "pb-24",
					)}
				>
					<SalesPreview />
				</ScrollArea>
				{!inboundCtx?.params?.inboundOrderId || (
					<div className="fixed bottom-0 w-full bg-white p-2">
						<div className="flex justify-end">
							<Button
								onClick={() => {
									inboundCtx.setParams({
										updateInboundStatus: true,
									});
								}}
							>
								Update Inbound
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
