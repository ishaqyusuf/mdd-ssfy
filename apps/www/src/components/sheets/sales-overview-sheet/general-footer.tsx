import { useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import {
    deleteSalesUseCase,
    restoreDeleteUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-use-case";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { MenuItemSalesCopy } from "@/components/menu-item-sales-copy";
import { MenuItemSalesMove } from "@/components/menu-item-sales-move";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
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
import { SalesType } from "@api/type";
import { copySalesUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { useSalesPrintParams } from "@/hooks/use-sales-print-params";
import { InvoicePrintModes } from "@sales/types";

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
    async function copyAs(as: SalesType) {
        loader.loading("Copying...");
        // const orderId = slug;
        const result = await copySalesUseCase(data?.orderId, as);
        try {
            if (as == "order")
                await resetSalesStatAction(result.id, data?.orderId);
        } catch (error) {}
        if (result.link) {
            loader.success(`Copied as ${as}`, {
                duration: 3000,
                action: (
                    <ToastAction
                        onClick={(e) => {
                            openLink(
                                salesFormUrl(as, result.data?.slug),
                                {},
                                true,
                            );
                        }}
                        altText="edit"
                    >
                        Edit
                    </ToastAction>
                ),
            });
            as == "order"
                ? sq.invalidate.salesList()
                : sq.invalidate.quoteList();
        }
    }
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
                        copyAs={copyAs}
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
