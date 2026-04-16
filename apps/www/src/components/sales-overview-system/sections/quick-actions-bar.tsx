"use client";

import { useTransition } from "react";

import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { SalesMenu } from "@/components/sales-menu";
import { useAuth } from "@/hooks/use-auth";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { toast } from "sonner";

import { SendForPackingButton } from "@/components/sales/send-for-packing-button";
import { useSalesOverviewSystem } from "../provider";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";

export function QuickActionsBar() {
    const {
        state: { data, isQuote },
    } = useSalesOverviewSystem();
    const sPreview = useSalesPreview();
    const batchSales = useBatchSales();
    const auth = useAuth();
    const [loading, startTransition] = useTransition();
    const canSendForPacking =
        auth.can?.editOrders &&
        auth.roleTitle?.toLowerCase() === "super admin" &&
        !isQuote;

    if (!data?.id) return null;

    function preview() {
        void sPreview.preview(data?.id, data?.type);
    }

    function reset() {
        startTransition(async () => {
            try {
                await resetSalesStatAction(data?.id, data?.orderId);
                toast.success("Reset complete");
            } catch {
                toast.error("Unable to complete");
            }
        });
    }

    return (
        <div className="flex flex-wrap gap-2">
            {canSendForPacking ? (
                <SendForPackingButton
                    salesId={data.id}
                    orderNo={data.orderId}
                    className="flex items-center gap-2"
                />
            ) : null}
            <Button
                onClick={preview}
                size="sm"
                variant="default"
                className="flex items-center gap-2"
            >
                <Icons.FileSearch className="size-3.5" />
                <span>Preview</span>
            </Button>
            <Button
                size="sm"
                variant="secondary"
                className="flex items-center gap-2"
                onClick={() => {
                    openLink(
                        salesFormUrl(data.type, data.orderId, data.isDyke),
                        {},
                        true,
                    );
                }}
            >
                <Icons.Edit className="size-3.5" />
                <span>Edit</span>
            </Button>
            <SalesMenu
                triggerVariant="secondary"
                id={data.id}
                slug={data.uuid}
                type={data.type}
            >
                {isQuote ? (
                    <SalesMenu.QuoteEmailMenuItems />
                ) : (
                    <>
                        <SalesMenu.SalesEmailMenuItems />
                        <SalesMenu.Sub>
                            <SalesMenu.SubTrigger>
                                <Icons.CheckCheck className="mr-2 size-4 text-muted-foreground/70" />
                                Mark as
                            </SalesMenu.SubTrigger>
                            <SalesMenu.SubContent>
                                <SalesMenu.Item
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        batchSales.markAsProductionCompleted(
                                            data.id,
                                        );
                                    }}
                                >
                                    Production Complete
                                </SalesMenu.Item>
                                <SalesMenu.Item
                                    onSelect={(e) => {
                                        e.preventDefault();
                                        batchSales.markAsFulfilled(data.id);
                                    }}
                                >
                                    Fulfillment Complete
                                </SalesMenu.Item>
                            </SalesMenu.SubContent>
                        </SalesMenu.Sub>
                        <SalesMenu.Separator />
                        <SalesMenu.Share />
                        <SalesMenu.SalesPrintMenuItems />
                        <SalesMenu.Copy />
                        <SalesMenu.Move />
                        <SalesMenu.Separator />
                        <SalesMenu.Item onSelect={reset} disabled={loading}>
                            <Icons.RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
                            Reset Stats
                        </SalesMenu.Item>
                        <AuthGuard rules={[_perm.is("viewSalesResolution")]}>
                            <SalesMenu.Item
                                onSelect={(e) => {
                                    e.preventDefault();
                                    openLink(
                                        "/sales-book/accounting/resolution-center",
                                        { salesNo: data.orderId },
                                        true,
                                    );
                                }}
                            >
                                <Icons.RefreshCcw className="mr-2 size-4 text-muted-foreground/70" />
                                Resolution Center
                            </SalesMenu.Item>
                        </AuthGuard>
                    </>
                )}
            </SalesMenu>
        </div>
    );
}
