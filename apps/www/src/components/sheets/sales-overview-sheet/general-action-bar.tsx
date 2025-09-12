import { Menu } from "@/components/(clean-code)/menu";
import { useSalesMailer } from "@/hooks/use-sales-email-sender";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useSaleOverview } from "./context";
import { cn } from "@gnd/ui/cn";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";
import { useBatchSales } from "@/hooks/use-batch-sales";
import { CheckCheck, FileSearch, RefreshCcw } from "lucide-react";
import { useSalesPreview } from "@/hooks/use-sales-preview";
import { MenuItemSalesActions } from "@/components/menu-item-sales-actions";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useRef, useState, useTransition } from "react";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";

import { useSalesPrintParams } from "@/hooks/use-sales-print-params";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { toast } from "sonner";

export function GeneralActionBar({ type, salesNo, salesId }) {
    const mailer = useSalesMailer();
    const { data } = useSaleOverview();
    const isQuote = data?.type == "quote";
    const batchSales = useBatchSales();
    const sPreview = useSalesPreview();
    function preview() {
        sPreview.preview(data?.orderId, data?.type);
    }
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
    const menuRef = useRef(null);
    return (
        <div className="flex gap-2">
            {/* <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        disabled
                        size="sm"
                        variant="secondary"
                        className="flex items-center space-x-2 hover:bg-secondary flex-1"
                    >
                        <Icons.Notifications className="size-3.5" />
                        <span>Remind</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send Reminder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to send a reminder for this
                            invoice?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                // sendReminderMutation.mutate({
                                //     id,
                                //     date: new Date().toISOString(),
                                // });
                            }}
                            // disabled={sendReminderMutation.isPending}
                        >
                            Send Reminder
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog> */}
            <Button
                onClick={(e) => {}}
                size="sm"
                variant="default"
                className="flex items-center space-x-2 hover:bg-secondary flex-1"
            >
                <FileSearch className="size-3.5" />
                <span>Preview</span>
            </Button>
            <Button
                size="sm"
                variant="secondary"
                className="flex-1 items-center space-x-2 hover:bg-secondary"
                onClick={() => {
                    openLink(salesFormUrl(type, salesNo, true), {}, true);
                    // setParams({ invoiceId: id, type: "edit" });
                }}
            >
                <Icons.Edit className="size-3.5" />
                <span>Edit</span>
            </Button>
            <Menu variant="secondary">
                {isQuote ? (
                    <>
                        <Menu.Item
                            // className={cn(!isQuote || "hidden")}
                            onClick={(e) => {
                                mailer.send({
                                    emailType: "without payment",
                                    salesIds: [salesId],
                                    printType: type,
                                });
                            }}
                        >
                            Quote Email
                        </Menu.Item>
                    </>
                ) : (
                    <>
                        <Menu.Item
                            icon="Email"
                            SubMenu={
                                <>
                                    <Menu.Item
                                        // className={cn(!isQuote || "hidden")}
                                        onClick={(e) => {
                                            mailer.send({
                                                emailType: "with payment",
                                                salesIds: [salesId],
                                                printType: type,
                                            });
                                        }}
                                    >
                                        Default
                                    </Menu.Item>
                                    <Menu.Item
                                        disabled
                                        onClick={(e) => {
                                            mailer.send({
                                                emailType: "with part payment",
                                                salesIds: [salesId],
                                                printType: type,
                                            });
                                        }}
                                    >
                                        Part Payment
                                    </Menu.Item>
                                </>
                            }
                        >
                            Payment Link
                        </Menu.Item>
                        <Menu.Item
                            Icon={CheckCheck}
                            SubMenu={
                                <>
                                    <Menu.Item
                                        // disabled={!produceable}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            batchSales.markAsProductionCompleted(
                                                salesId,
                                            );
                                        }}
                                    >
                                        Production Complete
                                    </Menu.Item>
                                    <Menu.Item
                                        onClick={(e) => {
                                            e.preventDefault();
                                            batchSales.markAsFulfilled(salesId);
                                        }}
                                    >
                                        Fulfillment Complete
                                    </Menu.Item>
                                </>
                            }
                        >
                            Mark as
                        </Menu.Item>
                        <Menu.Separator />
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
                    </>
                )}
            </Menu>
        </div>
    );
}

