import DevOnly from "@/_v2/components/common/dev-only";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { Menu } from "@/components/(clean-code)/menu";
import { useSalesPreviewModal } from "@/components/modals/sales-preview-modal";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { resetSalesStatAction } from "../../../data-actions/sales-stat-control.action";
import {
    deleteSalesUseCase,
    restoreDeleteUseCase,
} from "../../../use-case/sales-use-case";
import { openTxForm } from "../../tx-form";
import { refreshTabData } from "../helper";
import { salesOverviewStore } from "../store";
import { CopyMenuAction } from "./copy.menu.action";
import { MoveMenuAction } from "./move.menu.action";
import { PrintMenuAction } from "./print.menu.action";

export function Footer({}) {
    const store = salesOverviewStore();
    const sPreview = useSalesPreviewModal();
    function preview() {
        sPreview.preview(store.overview?.orderId, store.overview.type as any);
    }
    return (
        <div className="flex w-full gap-4 border-t py-2">
            <div className="flex-1"></div>
            <ConfirmBtn
                size="icon"
                Icon={Icons.trash}
                onClick={async () => {
                    const id = store?.salesId;
                    await deleteSalesUseCase(id);
                    revalidateTable();
                    toast("Deleted", {
                        action: {
                            label: "Undo",
                            onClick: async () => {
                                await restoreDeleteUseCase(id);
                                // ctx.refreshList?.();
                            },
                        },
                    });
                    // ctx.closeModal();
                }}
                trash
                variant="destructive"
            />
            <Button
                className="bg-purple-600 hover:bg-purple-700"
                variant="destructive"
                size="xs"
                onClick={preview}
            >
                Preview
            </Button>
            {store.adminMode && (
                <>
                    <Button
                        onClick={() => {
                            if (!store.overview?.customerId)
                                toast.error(
                                    "Payment requires a valid customer name.",
                                );
                            else
                                openTxForm({
                                    phoneNo: store.overview?.phoneNo,
                                    customerId: store.overview?.customerId,
                                    paymentMethod: "terminal",
                                    payables: [
                                        {
                                            amountDue: store.overview.due,
                                            id: store.overview.id,
                                            orderId: store.overview.orderId,
                                        },
                                    ],
                                });
                        }}
                        size="xs"
                        disabled={!store.overview?.due}
                    >
                        <Icons.dollar className="mr-2 size-4" />
                        <Money value={store.overview?.due}></Money>
                    </Button>
                </>
            )}
            <Menu variant="outline">
                <SalesEmailMenuItem
                    salesId={store.overview?.id}
                    salesType={store.overview?.type}
                />
                <PrintMenuAction />
                <PrintMenuAction pdf />
                <CopyMenuAction />
                <MoveMenuAction />
                {/* <DevOnly> */}
                <Menu.Item
                    Icon={RefreshCcw}
                    onClick={async () => {
                        await resetSalesStatAction(store.overview?.id);
                        toast.success("stat reset complete");
                        refreshTabData(store.currentTab);
                    }}
                >
                    Reset Item Stats
                </Menu.Item>
                {/* </DevOnly> */}
            </Menu>
        </div>
    );
}
