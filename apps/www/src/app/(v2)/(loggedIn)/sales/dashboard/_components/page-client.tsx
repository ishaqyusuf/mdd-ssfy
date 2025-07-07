"use client";

import { use } from "react";
import { GetSalesAction } from "../_actions/get-sales-action";
import { useDataTableColumn2 } from "@/components/common/data-table/columns/use-data-table-columns";
import { screens } from "@/lib/responsive";
import { useMediaQuery } from "react-responsive";
import { SalesCells } from "./sales-cells";
import { DataTable } from "@/app/_components/data-table";
import { TableToolbar } from "@/app/_components/data-table/toolbar";
import salesData from "../../sales-data";
import { getStaticCustomers } from "@/app/(v1)/(loggedIn)/sales/(customers)/_actions/sales-customers";
import { SaleSattBtn } from "../../_components/sale-stat-bootstrap/sale-stat-bootstrap-modal";
import { SalesPageType } from "../(tabbed)/delivery/page";

interface Props {
    response;
    type: SalesPageType;
    createType?: "order" | "quote";
    evaluation?: boolean;
}

export default function PageClient({
    response,
    type,
    evaluation,
    createType,
}: Props) {
    const { data, pageCount }: GetSalesAction = use(response);

    const isMobile = useMediaQuery(screens.xs);
    function renderWebView(ctx) {
        // console.log({ type });

        switch (type) {
            case "orders":
                if (evaluation)
                    return [
                        ctx.Column("Order #", SalesCells.Order),
                        ctx.Column("Customer", SalesCells.Customer),
                        ctx.Column("Address", SalesCells.Address),
                        // ctx.Column("Rep", SalesCells.SalesRep),
                        ctx.Column("Invoice", SalesCells.Invoice),
                        // ctx.Column("Invoice Due", SalesCells.PaymentDueDate),
                        ctx.Column("Dispatch", SalesCells.Dispatch),
                        ctx.Column("Status", SalesCells.SalesStatus),
                        ctx.ActionColumn(SalesCells.EvaluationSalesAction),
                    ];
                return [
                    ctx.Column("Order #", SalesCells.Order),
                    ctx.Column("Customer", SalesCells.Customer),
                    ctx.Column("Address", SalesCells.Address),
                    ctx.Column("Rep", SalesCells.SalesRep),
                    ctx.Column("Invoice", SalesCells.Invoice),
                    ctx.Column("Invoice Due", SalesCells.PaymentDueDate),
                    ctx.Column("Dispatch", SalesCells.Dispatch),
                    ctx.Column("Status", SalesCells.SalesStatus),
                    ctx.ActionColumn(SalesCells.SalesAction),
                ];
            case "quotes":
                return [
                    ctx.Column("Quote #", SalesCells.Order),
                    ctx.Column("Customer", SalesCells.Customer),
                    ctx.Column("Address", SalesCells.Address),
                    ctx.Column("Rep", SalesCells.SalesRep),
                    ctx.Column("Invoice", SalesCells.Invoice),
                    ctx.ActionColumn(SalesCells.SalesAction),
                ];
            case "delivery":
                return [
                    ctx.Column("Sales #", SalesCells.OrderDispatch),
                    ctx.Column("Shipping Address", SalesCells.Customer),
                    ctx.Column("Production", SalesCells.ProductionStatus),
                    ctx.Column("Delivery", SalesCells.DeliveryStatus),
                    ctx.ActionColumn(SalesCells.DeliveryAction),
                ];
            case "pickup":
                return [
                    ctx.Column("Sales #", SalesCells.OrderDispatch),
                    ctx.Column("Customer", SalesCells.Customer),
                    ctx.Column("Production", SalesCells.ProductionStatus),
                    ctx.ActionColumn(SalesCells.DeliveryAction),
                ];
        }
        return [];
    }
    const _table = useDataTableColumn2(
        data as any,
        {
            pageCount,
            cellVariants: {
                size: "sm",
            },
            filterCells: [
                "_status",
                "_q",
                "_payment",
                "_customerId",
                "_date",
                "_salesRepId",
            ],
        },
        (ctx) => renderWebView(ctx),
    );
    return (
        <>
            <SaleSattBtn />

            <section className="content">
                <DataTable {..._table.props}>
                    <TableToolbar>
                        <TableToolbar.Search />
                        <TableToolbar.Filter
                            options={salesData.filters.production}
                            id="_status"
                            title="Status"
                        />
                        {/* <TableToolbar.Filter
                            options={salesData.filters.invoice}
                            id="_payment"
                            title="Invoice"
                        />
                        <TableToolbar.Filter
                            id="_salesRepId"
                            title="Sales Rep"
                            optionFn={_getSalesRep}
                            labelKey="name"
                            valueKey="id"
                        /> */}
                        <TableToolbar.Filter
                            id="_customerId"
                            title="Customer"
                            optionFn={getStaticCustomers}
                            labelKey="name"
                            valueKey="id"
                        />
                        {createType && (
                            <>
                                <TableToolbar.ActionBtn
                                    icon="add"
                                    label="Old"
                                    variant="outline"
                                    href={`/sales/edit/${createType}/new`}
                                />
                            </>
                        )}
                    </TableToolbar>
                    <DataTable.Table />
                    <DataTable.Footer />
                </DataTable>
            </section>
        </>
    );
}
