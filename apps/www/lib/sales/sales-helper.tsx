"use client";

import { copyOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { toast } from "sonner";
import { openEmailComposer, openModal } from "../modal";
import { ISalesOrder, ISalesType, IOrderPrintMode } from "@/types/sales";
import {
    adminCompleteProductionAction,
    cancelProductionAssignmentAction,
    markProductionIncompleteAction,
} from "@/app/(v1)/(loggedIn)/sales/_actions/sales-production";
import optionBuilder from "../option-builder";
import { Icons } from "@/components/_v1/icons";

import QueryString from "qs";
import { moveOrderUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";

export const sales = {
    async move(order, to: ISalesType, router?) {
        const s = await moveOrderUseCase(order.orderId, to);

        toast.message(
            to == "quote" ? "Order moved to quote" : "Quote moved to order",
        );
        if (s.error) toast.error(s.error);
        else router?.push(s.link);
    },
    async copy(order, as: ISalesType = "order") {
        const _ = await copyOrderAction({
            orderId: order.orderId,
            as,
        });
        toast.success(`${as} copied successfully`, {});
    },
    async markIncomplete(row) {
        await markProductionIncompleteAction(row.id);
        toast.message("Production Marked as Incomplete");
    },
    async _clearAssignment(row) {
        await cancelProductionAssignmentAction(row.id);
        toast.message("Production Assignment Cancelled");
    },
    async completeProduction(row) {
        await adminCompleteProductionAction(row.id);
        toast.message("Production Completed");
    },
    salesMenuOption(row: ISalesOrder, modal, pdf, assignment) {
        const estimate = row.type == "quote";
        const _linkDir = row.isDyke
            ? `/sales-v2/overview/${row.type}/${row.slug}`
            : `/sales/${row.type}/${row.slug}`;
        const editHref = row.isDyke
            ? `/sales-book/edit-${row.type}/${row.slug}`
            : `${_linkDir}/form`;
        const mb = optionBuilder;
        const prodCompleted = row?.prodStatus == "Completed";
        return [
            mb.href("View", _linkDir, Icons.view),
            mb.href("Edit", editHref, Icons.edit),
            mb.simple(
                "Email",
                () => {
                    openEmailComposer(row, {
                        type: "sales",
                        parentId: row.id,
                    });
                },
                Icons.Email,
            ),
            !estimate &&
                mb.simple(
                    "Production",
                    () => {
                        assignment.open(row.id);
                    },
                    Icons.production,
                ),
            mb.simple(
                !estimate ? "Move to Quote" : "Move to Order",
                async () => await this.move(row, estimate ? "order" : "quote"),
                estimate ? Icons.orders : Icons.estimates,
            ),
            mb.more(
                "Copy",
                [
                    mb.simple(
                        "As Order",
                        async () => {
                            await this.copy(row, "order");
                        },
                        Icons.orders,
                    ),
                    mb.simple(
                        "As Quote",
                        async () => {
                            await this.copy(row, "quote");
                        },
                        Icons.estimates,
                    ),
                ],
                Icons.copy,
            ),
            this.printMenu(row, "Print", false, "main", pdf),
            this.printMenu(row, "Print Mockup", true, "main", pdf),
            this.printMenu(row, "Pdf", false, "pdf", pdf),
        ].filter(Boolean);
    },
    print(
        props: {
            ids;
            mode: IOrderPrintMode;
            mockup?: boolean;
            prints?: boolean;
            pdf?: boolean;
        },
        pdf,
    ) {
        if (props.pdf) {
            // const { mode, ids } = props;
            // dispatchSlice("printOrders", {
            //     mode,
            //     pdf: props.pdf,
            //     mockup: props.mockup,
            //     ids,
            //     isClient: !["production", "packing list"].includes(mode),
            //     showInvoice: ["order", "quote", "invoice"].includes(mode),
            //     packingList: mode == "packing list",
            //     isProd: mode == "production",
            // });
            // return;
            pdf.print({
                slugs: props.ids.join(","),
                mode: props.mode as any,
                mockup: props.mockup ? "yes" : "no",
                preview: false,
                pdf: true,
            });
            return;
        }
        const query = {
            slugs: props.ids.join(","),
            mode: props.mode as any,
            mockup: props.mockup ? "yes" : "no",
            preview: false,
        };
        const link = document.createElement("a");

        let base = process.env.NEXT_PUBLIC_APP_URL;
        const href =
            (link.href = `${base}/printer/sales?${QueryString.stringify(
                query,
            )}`);
        QueryString.stringify(props);
        // console.log(href);
        link.target = "_blank";
        link.click();
    },
    printMenu(row, title, mockup, type, pdf) {
        const mb = optionBuilder;
        function _print(mode: IOrderPrintMode) {
            printOrder(
                {
                    ids: [row.slug],
                    mode,
                    mockup,
                    pdf: type == "pdf",
                    prints: true,
                },
                pdf,
            );
        }
        return optionBuilder.more(
            title,
            [
                mb.simple("Quote", () => _print("quote"), Icons.estimates),
                mb.simple("Order", () => _print("order"), Icons.orders),
                mb.simple(
                    "Packing List",
                    () => _print("packing list"),
                    Icons.packingList,
                ),
                mb.simple(
                    "Production",
                    () => _print("production"),
                    Icons.production,
                ),
            ],
            type == "pdf" ? Icons.edit : Icons.print,
        );
    },
};
const printOrder = sales.print;
