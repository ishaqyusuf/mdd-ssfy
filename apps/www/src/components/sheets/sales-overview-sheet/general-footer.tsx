import { useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useSaleOverview } from "./context";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { SalesMenu } from "@/components/sales-menu";

export function GeneralFooter({}) {
    const { data } = useSaleOverview() as { data?: any };
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

    return (
        <CustomSheetContentPortal>
            <SheetFooter className="sm:-m-4 sm:-mb-2 sm:border-t p-4  max-md:flex-row max-md:gap-4 max-md:justify-end max-md:fixed max-md:bottom-0 max-md:bg-accent max-md:w-full">
                <Button
                    size="sm"
                    onClick={(e) => {
                        preview();
                        return;
                    }}
                >
                    Preview
                </Button>
                <SalesMenu
                    open={menuOpen}
                    onOpenChange={setMenuOpen}
                    id={data?.id}
                    slug={data?.uuid}
                    type={data?.type}
                >
                    <SalesMenu.Share />
                    {data?.type === "quote" ? (
                        <SalesMenu.QuotePrintMenuItems />
                    ) : (
                        <SalesMenu.SalesPrintMenuItems />
                    )}
                    <SalesMenu.Copy />
                    <SalesMenu.Move />
                    <SalesMenu.Separator />
                    {data?.type === "quote" ? (
                        <SalesMenu.QuoteEmailMenuItems />
                    ) : (
                        <SalesMenu.SalesEmailMenuItems />
                    )}
                    <SalesMenu.Separator />
                    <SalesMenu.Delete onDeleted={() => qs.close()} />
                    <SalesMenu.Item onSelect={reset} disabled={loading}>
                        <RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
                        Reset Stats
                    </SalesMenu.Item>
                    <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
                        <SalesMenu.Item
                            onSelect={(e) => {
                                e.preventDefault();
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
                            <RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
                            Resolution Center
                        </SalesMenu.Item>
                    </AuthGuard>
                </SalesMenu>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
