import { useRef, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import {
    deleteSalesUseCase,
    restoreDeleteUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";
import { ToastAction } from "@gnd/ui/toast";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSaleOverview } from "./context";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { useSalesPrintParams } from "@/hooks/use-sales-print-params";
import { InvoicePrintModes } from "@sales/types";
import { MenuItemSalesActions } from "@/components/menu-item-sales-actions";

export function GeneralFooter({}) {
    const { data } = useSaleOverview();
    const [loading, startTransition] = useTransition();
    const qs = useSalesOverviewQuery();
    const sPreview = useSalesPreview();
    function preview() {
        sPreview.preview(data?.orderId, data?.type);
    }
    async function reset() {
        startTransition(async () => {
            try {
                const resp = await resetSalesStatAction(
                    data?.id,
                    data?.orderId,
                );
                toast.success("Reset complete");
                qs.salesQuery.salesStatReset();
                // qs.setParams({
                //     refreshTok: generateRandomString(),
                // });
            } catch (error) {
                toast.error("Unable to complete");
            }
        });
    }
    const [menuOpen, setMenuOpen] = useState(false);
    const printer = useSalesPrintParams();
    const loader = useLoadingToast();
    const sq = useSalesQueryClient();
    const deleteSale = async () => {
        // const id = store?.salesId;
        loader.loading("Deleting...");
        await deleteSalesUseCase(data?.id);
        data?.type == "order"
            ? sq.invalidate.salesList()
            : sq.invalidate.quoteList();
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

    const menuRef = useRef(null);

    return (
        <CustomSheetContentPortal>
            <SheetFooter className="sm:-m-4 sm:-mb-2 sm:border-t p-4  max-md:flex-row max-md:gap-4 max-md:justify-end max-md:fixed max-md:bottom-0 max-md:bg-accent max-md:w-full">
                <ConfirmBtn
                    size="icon"
                    Icon={Icons.trash}
                    onClick={deleteSale}
                    trash
                    variant="destructive"
                />
                <Button
                    size="sm"
                    onClick={(e) => {
                        preview();
                        return;
                        printer.setParams({
                            ids: [data?.id],
                            modal: true,
                            type: data?.type,
                            preview: true,
                            access: "internal",
                            mode: "invoice" as InvoicePrintModes,
                        });
                    }}
                >
                    Preview
                </Button>
                <Menu
                    ref={menuRef}
                    open={menuOpen}
                    onOpenChanged={setMenuOpen}
                    variant="outline"
                >
                    <MenuItemSalesActions
                        slug={data?.uuid}
                        menuRef={menuRef}
                        setMenuOpen={setMenuOpen}
                        id={data?.id}
                        type={data?.type}
                    />
                    <Menu.Item
                        Icon={RefreshCcw}
                        onClick={reset}
                        disabled={loading}
                    >
                        Reset Stats
                    </Menu.Item>
                    <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
                        <Menu.Item
                            Icon={RefreshCcw}
                            onClick={(e) => {
                                openLink(
                                    `/sales-book/accounting/resolution-center`,
                                    {
                                        salesNo: data.orderId,
                                    },
                                    true,
                                );
                            }}
                            disabled={loading}
                        >
                            Resolution Center
                        </Menu.Item>
                    </AuthGuard>
                </Menu>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
