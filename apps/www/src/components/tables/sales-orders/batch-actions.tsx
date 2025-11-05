import {
    BatchAction,
    BatchBtn,
    BatchDelete,
} from "@gnd/ui/custom/data-table/batch-action";
import { useMemo, useRef } from "react";
import { SalesEmailMenuItem } from "@/components/sales-email-menu-item";
import { deleteSalesByOrderIds } from "@/app-deps/(clean-code)/(sales)/_common/data-actions/sales-actions";
import { useTable } from "@gnd/ui/data-table";
import { MenuItemPrintAction } from "@/components/menu-item-sales-print-action";
import { DropdownMenu } from "@gnd/ui/composite";
import { SuperAdminGuard } from "@/components/auth-guard";
import { SalesPaymentProcessor } from "@/components/widgets/sales-payment-processor/sales-payment-processor";
import { sum } from "@gnd/utils";

export function BatchActions({}) {
    const ctx = useTable();
    const slugs = useMemo(() => {
        return ctx.selectedRows?.map((r) => (r.original as any)?.orderId);
    }, [ctx.selectedRows]);
    const salesIds = ctx.selectedRows?.map((c) => c?.original?.id);
    const sameCustomers =
        [...new Set(ctx.selectedRows?.map((a) => a?.original?.accountNo))]
            .length == 1 &&
        sum(ctx?.selectedRows?.map((a) => a?.original?.due)) > 0;
    // if (!ctx.selectedRows?.length) return null;
    const item = ctx.selectedRows?.[0]?.original;
    const buttonRef = useRef<HTMLButtonElement>(null);
    return (
        <>
            {!ctx.selectedRows?.length || (
                <BatchAction>
                    <BatchBtn
                        icon="print"
                        menu={
                            <>
                                <MenuItemPrintAction
                                    slug={slugs.join(",")}
                                    type="order"
                                />

                                <DropdownMenu.Separator />
                                <DropdownMenu.Group>
                                    <MenuItemPrintAction
                                        slug={slugs.join(",")}
                                        type="order"
                                        pdf
                                    />
                                    {/* <SuperAdminGuard> */}
                                    <MenuItemPrintAction
                                        type="order"
                                        salesIds={salesIds}
                                    />
                                    {/* </SuperAdminGuard> */}
                                </DropdownMenu.Group>
                            </>
                        }
                    >
                        Print
                    </BatchBtn>
                    <BatchBtn
                        icon="Email"
                        menu={
                            <>
                                <SalesEmailMenuItem
                                    asChild
                                    salesType="order"
                                    orderNo={slugs}
                                />
                            </>
                        }
                    >
                        Email
                    </BatchBtn>
                    <SalesPaymentProcessor
                        phoneNo={item?.customerPhone}
                        selectedIds={salesIds}
                        customerId={item?.customerId}
                        buttonProps={{
                            variant: "ghost",
                        }}
                    >
                        {/* <button ref={buttonRef}></button> */}
                        {/* <BatchBtn

                            // onClick={(e) => {
                            //     buttonRef.current?.click();
                            // }}
                            disabled={!sameCustomers}
                            icon="billing"
                        >
                            Pay
                        </BatchBtn> */}
                    </SalesPaymentProcessor>
                    <BatchDelete
                        onClick={async () => {
                            await deleteSalesByOrderIds(slugs);
                        }}
                    />
                </BatchAction>
            )}
        </>
    );
}

