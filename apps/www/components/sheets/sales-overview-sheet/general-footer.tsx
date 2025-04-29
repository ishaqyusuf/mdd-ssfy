import { useState, useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import {
    deleteSalesUseCase,
    restoreDeleteUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";
import { Menu } from "@/components/(clean-code)/menu";
import { MenuItemSalesCopy } from "@/components/menu-item-sales-copy";
import { MenuItemSalesMove } from "@/components/menu-item-sales-move";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { useSalesPreviewModal } from "@/components/modals/sales-preview-modal";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { generateRandomString } from "@/lib/utils";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";
import { ToastAction } from "@gnd/ui/toast";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSaleOverview } from "./context";

export function GeneralFooter({}) {
    const { data } = useSaleOverview();
    const [loading, startTransition] = useTransition();
    const qs = useSalesOverviewQuery();
    async function reset() {
        startTransition(async () => {
            try {
                const resp = await resetSalesStatAction(
                    data?.id,
                    data?.orderId,
                );
                toast.success("Reset complete");
                qs._refreshToken();
                // qs.setParams({
                //     refreshTok: generateRandomString(),
                // });
            } catch (error) {
                toast.error("Unable to complete");
            }
        });
    }
    const [menuOpen, setMenuOpen] = useState(false);
    const sPreview = useSalesPreviewModal();
    function preview() {
        sPreview.preview(data?.orderId, data?.type);
    }
    const loader = useLoadingToast();
    const deleteSale = async () => {
        // const id = store?.salesId;
        loader.loading("Deleting...");
        await deleteSalesUseCase(data?.id);
        revalidateTable();
        loader.success("Deleted", {
            description: "Undo delete?",
            action: (
                <ToastAction
                    onClick={async (e) => {
                        await restoreDeleteUseCase(data?.id);
                    }}
                    altText="delete"
                >
                    Edit
                </ToastAction>
            ),
        });
    };
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                <ConfirmBtn
                    size="icon"
                    Icon={Icons.trash}
                    onClick={deleteSale}
                    trash
                    variant="destructive"
                />
                <Button size="sm" onClick={preview}>
                    Preview
                </Button>
                <Menu
                    open={menuOpen}
                    onOpenChanged={setMenuOpen}
                    variant="outline"
                >
                    <SalesEmailMenuItem
                        salesId={data?.id}
                        salesType={data?.type}
                    />
                    <MenuItemPrintAction
                        salesId={data?.id}
                        slug={data?.uuid}
                        onOpenMenu={setMenuOpen}
                        type={data?.type}
                    />
                    <MenuItemPrintAction
                        salesId={data?.id}
                        slug={data?.uuid}
                        onOpenMenu={setMenuOpen}
                        type={data?.type}
                        pdf
                    />
                    <MenuItemSalesCopy
                        slug={data?.uuid}
                        onOpenMenu={setMenuOpen}
                        type={data?.type}
                    />
                    <MenuItemSalesMove
                        slug={data?.uuid}
                        onOpenMenu={setMenuOpen}
                        type={data?.type}
                    />
                    <Menu.Item
                        Icon={RefreshCcw}
                        onClick={reset}
                        disabled={loading}
                    >
                        Reset Stats
                    </Menu.Item>
                </Menu>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
