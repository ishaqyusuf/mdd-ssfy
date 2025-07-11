import React from "react";
import Link from "next/link";
import { Env } from "@/components/env";
import { Icons } from "@/components/_v1/icons";
import Money from "@/components/_v1/money";
import Button from "@/components/common/button";
import { _modal } from "@/components/common/modal/provider";
import { SalesInvoiceDueStatus } from "@/components/sales-invoice-due-status";
import { LaborCostInline } from "@/components/sheets/sales-overview-sheet/labor-cost-inline";
import { PoInline } from "@/components/sheets/sales-overview-sheet/po-inline";
import { SalesDateInline } from "@/components/sheets/sales-overview-sheet/sales-date-inline";
import { SalesDeliveryCostInline } from "@/components/sheets/sales-overview-sheet/sales-delivery-cost-inline";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { cn } from "@/lib/utils";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { ExternalLink } from "lucide-react";

import { buttonVariants } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";

import { composeSalesUrl } from "../../../../utils/sales-utils";
import { salesOverviewStore } from "../../store";

export function SalesInfoTab({}) {
    const store = salesOverviewStore();
    const overview = store.overview;
    const salesQuery = useSalesOverviewQuery();
    const customerOverviewQuery = useCustomerOverviewQuery();

    if (!overview) return;
    return null;
    // return (
    //     <div>
    //         <InfoLine label="Order #" value={overview.orderId}>
    //             <Link
    //                 className={cn(
    //                     buttonVariants({
    //                         size: "xs",
    //                         variant: "link",
    //                     }),
    //                 )}
    //                 href={composeSalesUrl(overview)}
    //                 target="_blank"
    //             >
    //                 Edit
    //                 <ExternalLink className="ml-2 size-4" />
    //             </Link>
    //         </InfoLine>
    //         <InfoLine
    //             label="Customer"
    //             value={
    //                 <div>
    //                     <Button
    //                         size="xs"
    //                         disabled={!overview?.phoneNo}
    //                         onClick={() => {
    //                             _modal.close();
    //                             customerOverviewQuery.open(overview.phoneNo);
    //                         }}
    //                         variant={
    //                             overview?.phoneNo ? "destructive" : "outline"
    //                         }
    //                     >
    //                         {overview?.displayName || overview?.phoneNo}
    //                     </Button>
    //                 </div>
    //             }
    //         ></InfoLine>
    //         <SalesDateInline />
    //         <InfoLine
    //             label="Sales Rep"
    //             value={overview.salesRep?.name}
    //         ></InfoLine>

    //         <PoInline />
    //         <LaborCostInline />
    //         <SalesDeliveryCostInline />
    //         <InfoLine
    //             label="Total Invoice"
    //             value={<Money value={overview?.invoice?.total} />}
    //         ></InfoLine>
    //         <InfoLine
    //             label="Paid"
    //             value={<Money value={overview?.invoice?.paid} />}
    //         ></InfoLine>
    //         <InfoLine
    //             label="Pending"
    //             value={
    //                 <span>
    //                     <SalesInvoiceDueStatus
    //                         amountDue={overview?.invoice?.pending}
    //                         dueDate={overview?.paymentDueDate}
    //                     />
    //                 </span>
    //             }
    //         ></InfoLine>

    //         <div className="my-4 grid gap-4 sm:grid-cols-2">
    //             {[overview.billing, overview.shipping].map((address, i) => (
    //                 <div key={i}>
    //                     <Label>
    //                         {i == 0 ? "Billing" : "Shipping"}
    //                         {" Address"}
    //                     </Label>

    //                     {!address?.length ? (
    //                         <div className="flex min-h-16 flex-col items-center justify-center">
    //                             No Address
    //                         </div>
    //                     ) : (
    //                         <address className="text-sm not-italic text-muted-foreground">
    //                             {address?.filter(Boolean).map((line, li) => (
    //                                 <React.Fragment key={li}>
    //                                     {line}
    //                                     <br />
    //                                 </React.Fragment>
    //                             ))}
    //                         </address>
    //                     )}
    //                 </div>
    //             ))}
    //         </div>
    //         <Env isDev>
    //             <Button
    //                 onClick={() => {
    //                     _modal.close();
    //                     salesQuery.open2(overview.orderId, "sales");
    //                 }}
    //             >
    //                 V2
    //             </Button>
    //         </Env>
    //         <Note
    //             admin
    //             tagFilters={[
    //                 // noteTagFilter("itemControlUID", itemView?.itemControlUid),
    //                 // noteTagFilter("salesItemId", itemView?.itemId),
    //                 noteTagFilter("salesId", store?.salesId),
    //             ]}
    //             typeFilters={["general", "dispatch", "payment", "production"]}
    //             statusFilters={["public", "private"]}
    //             subject={`Sales Note`}
    //             headline={`${overview?.orderId}`}
    //         />
    //     </div>
    // );
}
export function InfoLine({
    label,
    value,
    children,
}: {
    label?: string;
    value?;
    children?;
}) {
    return (
        <div className="b flex items-center gap-4 border-b p-1 py-2">
            <span className="text-sm font-semibold uppercase text-muted-foreground">
                {label}:
            </span>
            <div className="flex-1"></div>
            <span className="font-mono text-sm uppercase">{value}</span>
            {children}
        </div>
    );
}
