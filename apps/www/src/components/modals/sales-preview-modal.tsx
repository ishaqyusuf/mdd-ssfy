"use client";

import { Dialog, DialogContent } from "@gnd/ui/dialog";

import { ScrollArea } from "@gnd/ui/scroll-area";
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
    const { params } = ctx;
    // const [data, setData] = useState(null as any);
    // useEffect(() => {
    //     if (params.salesPreviewSlug) {
    //         getSalesPrintData(params.salesPreviewSlug, {
    //             mode: params.salesPreviewType,
    //             preview: true,
    //         }).then((result) => {
    //             console.log({ result });

    //             setData(result as any);
    //         });
    //     }
    // }, [params.salesPreviewSlug]);
    return (
        <Dialog
            onOpenChange={(e) => {
                ctx.close();
                inboundCtx?.setParams(null);
            }}
            open={ctx.opened}
        >
            <DialogContent className="w-[800px]s max-w-4xl">
                <ScrollArea className="h-[90vh] pb-24 overflow-auto">
                    <SalesPreview />
                </ScrollArea>
                {!inboundCtx?.params?.inboundOrderId || (
                    <div className="fixed bottom-0 p-2 w-full bg-white">
                        <div className="flex justify-end">
                            <Button
                                onClick={(e) => {
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
