"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@gnd/ui/dialog";

import { useSalesPreview } from "@/hooks/use-sales-preview";
import { SalesPreview } from "../sales-preview";
import { useInboundStatusModal } from "@/hooks/use-inbound-status-modal";
import { Button } from "@gnd/ui/button";

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
	const closePreview = () => {
		ctx.close();
		inboundCtx?.setParams(null);
	};

	return (
		<Dialog onOpenChange={closePreview} open={ctx.opened}>
			<DialogContent className="fixed inset-0 left-0 top-0 flex h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:rounded-none">
				<DialogHeader className="sr-only">
					<DialogTitle>Sales preview</DialogTitle>
				</DialogHeader>
				<SalesPreview onClose={closePreview} />
				{!inboundCtx?.params?.inboundOrderId ? null : (
					<div className="absolute right-6 bottom-24 z-50 rounded-full border bg-background/90 p-2 shadow-lg backdrop-blur">
						<div className="flex justify-end gap-2">
							<Button
								size="sm"
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
