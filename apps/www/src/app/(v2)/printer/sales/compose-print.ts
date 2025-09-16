import salesData, {
    SalesTaxes,
} from "@/app/(clean-code)/(sales)/_common/utils/sales-data";
import { CustomerMeta } from "@/app/(clean-code)/(sales)/types";
import {
    AddressBooks,
    Customers,
    DykeSalesDoors,
    DykeSalesShelfItem,
} from "@/db";
import { formatDate } from "@/lib/use-day";
import { formatCurrency, ftToIn, sum } from "@/lib/utils";
import { IAddressMeta } from "@/types/sales";

import {
    composeSalesItems,
    ViewSaleType,
} from "../../(loggedIn)/sales-v2/_utils/compose-sales-items";
import { isComponentType } from "../../(loggedIn)/sales-v2/overview/is-component-type";
import salesFormUtils from "../../(loggedIn)/sales/edit/sales-form-utils";
import { PrintTextProps } from "../components/print-text";
import { SalesPrintProps } from "./page";
import { Note } from "@gnd/utils/note";

type PrintData = {
    order: ViewSaleType;
    isEstimate?: boolean;
    isProd?: boolean;
    isPacking?: boolean;
    isOrder?: boolean;
    query?: SalesPrintProps["searchParams"];
    dispatchNote?: Note;
} & ReturnType<typeof composeSalesItems>;

type PrintStyles = "base" | "lg-bold";
export function composePrint(
    data: PrintData,
    query: SalesPrintProps["searchParams"],
) {
    data = {
        ...data,
        query,
        isEstimate: query.mode == "quote",
        isProd: query.mode == "production",
        isPacking: query.mode == "packing list",
        isOrder: query.mode == "order",
    };
    let paymentDate = null;
    if (data.order.amountDue <= 1) {
        //
        let pd = data.order.payments?.[0]?.createdAt;
        if (pd) paymentDate = formatDate(pd);
    }
    const printData = {
        isEstimate: query.mode == "quote",
        isProd: query.mode == "production",
        isPacking: query.mode == "packing list",
        isOrder: query.mode == "order",
        paymentDate,
        ...query,
        // address: address(data,this.isOrder),
        // heading: heading(data,),
        ...data,
    };

    const ret = {
        ...printData,
        lineItems: lineItems(data, {
            ...printData,
        }),
        headerTitle: query.mode == "order" ? "Invoice" : query.mode,
        footer: printFooter(data, printData.isProd || printData.isPacking),
        address: address({ ...printData.order }),
        heading: heading({ ...printData }),
        doorsTable: getDoorsTable({ ...printData }, data),
        shelfItemsTable: shelfItemsTable(printData, data),
    };
    type RetType = NonNullable<typeof ret>;

    type ShelfType = RetType["shelfItemsTable"];
    let orderedPrinting: {
        _index;
        shelf?: NonNullable<RetType["shelfItemsTable"]>[0];
        nonShelf?: NonNullable<RetType["doorsTable"]>["doors"][0];
    }[] = [];
    ret.doorsTable?.doors.map((d) => {
        orderedPrinting.push({
            _index: d._index,
            nonShelf: d,
        });
    });
    (ret.shelfItemsTable as any)?.map((d) => {
        orderedPrinting.push({
            _index: d._index,
            shelf: d,
        });
    });
    orderedPrinting = orderedPrinting.sort((a, b) => a._index - b._index);
    return {
        ...ret,
        orderedPrinting,
    };
}
function shelfItemsTable(
    { isProd, isPacking, isOrder, isEstimate },
    data: PrintData,
) {
    const price = !isProd && !isPacking;
    // keyof DykeSalesDoors
    type T = keyof DykeSalesShelfItem;
    const res = {
        cells: [
            _cell<T>(
                "#",
                null,
                1,
                { position: "center" },
                { position: "center" },
            ),
            _cell<T>(
                "Item",
                "description",
                price ? 7 : isPacking ? 11 : 14,
                { position: "left" },
                { position: "left" },
            ),
            _cell<T>(
                "Qty",
                "qty",
                2,
                { position: "center" },
                { position: "center" },
            ),
        ],
    };
    if (price)
        res.cells.push(
            ...[
                _cell<T>(
                    "Rate",
                    "unitPrice",
                    3,
                    { position: "right" },
                    { position: "right" },
                ),
                _cell<T>(
                    "Total",
                    "totalPrice",
                    3,
                    { position: "right" },
                    { position: "right", font: "bold" },
                ),
            ],
        );
    if (isPacking) res.cells.push(_cell<T>("Fulfilment", "packing", 3));
    const newResp = data.order.items
        .filter((item) => item.shelfItems.length)
        .map((item) => {
            return {
                item,
                cells: res.cells,
                _index: item.meta.lineIndex,
                _shelfItems: item.shelfItems.map((shelfItem, itemIndex) =>
                    composeShelfItem<typeof res.cells>(
                        res.cells,
                        shelfItem,
                        itemIndex,
                    ),
                ),
            };
        });
    return newResp;
    const dt = {
        ...res,
        items: data.shelfItems.map((item, itemIndex) => {
            return composeShelfItem<typeof res.cells>(
                res.cells,
                item,
                itemIndex,
            );
        }),
    };
    // if (!dt.items.length) return null;
    // return dt;
}
function composeShelfItem<T>(
    cells: T,
    shelfItem,
    itemIndex,
): { style; value; colSpan }[] {
    return (cells as any).map((cell, _i) => {
        const ret = {
            style: cell.cellStyle,
            value:
                _i == 0
                    ? itemIndex + 1
                    : cell.cell == "description"
                      ? shelfItem.description || shelfItem.shelfProduct?.title
                      : shelfItem?.[cell.cell as any],
            colSpan: cell.colSpan,
        };
        if (_i > 2 && ret.value) ret.value = formatCurrency.format(ret.value);
        return ret;
    });
}
type Cell =
    | "door"
    | "dimension"
    | "lhQty"
    | "rhQty"
    | "qty"
    | "unitPrice"
    | "lineTotal"
    | "description"
    | "totalPrice"
    | "swing"
    | "moulding"
    | "packing"
    | null;
function _cell<T>(
    title,
    cell: Cell,
    colSpan = 2,
    style?: PrintTextProps,
    cellStyle?: PrintTextProps,
) {
    return { title, cell, colSpan, style, cellStyle };
}
function packingInfo(data: PrintData, itemId, doorId?) {
    const deliveryId = data.query.dispatchId;
    if (!data.isPacking || !deliveryId) return null;
    const deliveries = data.order.deliveries;
    const deliv = deliveries.find((d) => d.id == deliveryId);
    let items =
        deliveryId == "all"
            ? deliveries?.map((d) => d.items).flat()
            : deliv?.items;
    if (!items) return "N/A";
    const filtered = items.filter((item) => {
        //   ((doorId
        //       ? item.submission?.assignment?.salesDoorId == doorId &&
        //         item.orderItemId == itemId
        //       : item.orderItemId == itemId) &&
        //       item.orderDeliveryId == deliveryId) ||
        //       deliveryId == "all";
        const boooleans = [item.orderItemId == itemId];
        if (doorId)
            boooleans.push(item.submission?.assignment?.salesDoorId == doorId);
        if (deliveryId != "all")
            boooleans.push(item.orderDeliveryId == deliveryId);
        return boooleans.every(Boolean);
    });

    if (!filtered?.length) return `N/A`;
    // return `N/A - ${items.length}-  ${items
    //     // .filter((d) => d.orderDeliveryId == deliveryId)
    //     .map((d) => d.orderDeliveryId)
    //     .join(",")} | ${deliveries.map((d) => d.items.length).join(",")} | ${
    //     deliveries.filter((d) => d.deletedAt).length
    // }`;
    const sumLh = sum(filtered, "lhQty");
    const sumRh = sum(filtered, "rhQty");
    const sumQty = sum(filtered, "qty");
    let texts = [];
    if (sumLh) texts.push(`${sumLh} LH`);
    if (sumRh) texts.push(`${sumRh} RH`);
    if (!sumLh && !sumRh && sumQty) texts.push(`${sumQty}`);
    return texts.join(` & `);
}
function getDoorsTable(
    { isProd, isPacking, isOrder, isEstimate },
    data: PrintData,
) {
    const deliveries = data.order.deliveries;
    const price = !isProd && !isPacking;

    const dt = {
        // ...res,
        doors: data.order.items
            .filter(
                (item) =>
                    item.housePackageTool ||
                    item?.meta?.doorType == "Services" ||
                    item?.meta?.doorType === "Mouldings",
            )
            .filter(
                (item) =>
                    !item.multiDykeUid || (item.multiDykeUid && item.multiDyke),
            )
            .map((item) => {
                const doorType = item.meta.doorType;

                const is = isComponentType(doorType);
                const noHandle = item.configs
                    ? item.configs.noHandle
                    : !is.bifold && !is.service && !is.slab;
                const hasSwing = item.configs
                    ? item.configs.hasSwing
                    : !is.bifold && !is.service;

                const res = {
                    cells: [
                        _cell(
                            "#",
                            null,
                            1,
                            { position: "center" },
                            { position: "center" },
                        ),

                        ...(is.moulding
                            ? [
                                  _cell(
                                      "Moulding",
                                      "moulding",
                                      price ? 4 : isPacking ? 7 : 10,
                                      { position: "left" },
                                      { position: "left" },
                                  ),
                                  _cell(
                                      "Qty",
                                      "qty",
                                      2,
                                      { position: "center" },
                                      { position: "center" },
                                  ),
                              ]
                            : [
                                  ...(is.service
                                      ? [
                                            _cell(
                                                "Description",
                                                "description",
                                                price ? 4 : isPacking ? 7 : 10,
                                                { position: "left" },
                                                { position: "left" },
                                            ),
                                        ]
                                      : [
                                            _cell(
                                                "Door",
                                                "door",
                                                price ? 4 : isPacking ? 7 : 10,
                                                { position: "left" },
                                                { position: "left" },
                                            ),
                                            _cell(
                                                "Size",
                                                "dimension",
                                                2,
                                                { position: "left" },
                                                { position: "left" },
                                            ),
                                        ]),
                                  ...(is.garage
                                      ? [_cell("Swing", "swing", 2, {}, {})]
                                      : []),
                                  ...// is.bifold || is.slab || is.service
                                  (noHandle
                                      ? [
                                            _cell(
                                                "Qty",
                                                "qty",
                                                2,
                                                { position: "center" },
                                                { position: "center" },
                                            ),
                                        ]
                                      : [
                                            _cell(
                                                "Left Hand",
                                                "lhQty",
                                                2,
                                                { position: "center" },
                                                { position: "center" },
                                            ),
                                            _cell(
                                                "Right Hand",
                                                "rhQty",
                                                2,
                                                { position: "center" },
                                                { position: "center" },
                                            ),
                                        ]),
                              ]),
                    ],
                };
                if (price) {
                    res.cells.push(
                        ...[
                            _cell(
                                "Rate",
                                "unitPrice",
                                3,
                                { position: "right" },
                                { position: "right" },
                            ),
                            _cell(
                                "Total",
                                "lineTotal",
                                3,
                                { position: "right" },
                                { position: "right", font: "bold" },
                            ),
                        ],
                    );
                }
                if (isPacking)
                    res.cells.push(
                        _cell(
                            "Shipped Qty",
                            "packing",
                            3,
                            { position: "center" },
                            { position: "center", font: "bold" },
                        ),
                    );

                const details =
                    is.moulding || is.bifold
                        ? []
                        : [
                              ...item.formSteps.filter(
                                  (t) =>
                                      !["Door", "Item Type", "Moulding"].some(
                                          (s) => s == t.step.title,
                                      ),
                              ),
                          ];
                const lines: any = [];
                const _multies = data.order.items.filter(
                    (i) =>
                        (!item.multiDyke && i.id == item.id) ||
                        (item.multiDyke && item.multiDykeUid == i.multiDykeUid),
                );
                _multies.map((m, _) => {
                    const getVal = (
                        cell: Cell,
                        door?: DykeSalesDoors,
                        doorTitle?,
                    ) => {
                        switch (cell) {
                            case "swing":
                                return door?.swing;
                            case "qty":
                                const lhQty = door?.lhQty;
                                return door?.totalQty || lhQty || m.qty;
                            case "description":
                                return m.description;
                            case "door":
                                return doorTitle;
                            // return item.formSteps.find(
                            //     (s) => s.step.title == "Door"
                            // )?.value;
                            case "dimension":
                                // return `ss`;
                                // return door?.dimension;
                                const dimIn = door?.dimension
                                    ?.split("x")
                                    ?.map((a) =>
                                        ftToIn(a?.trim())?.replaceAll(
                                            "in",
                                            '"',
                                        ),
                                    )
                                    .join(" x ");
                                return [`${door.dimension}`, `(${dimIn})`];

                            case "moulding":
                                return (
                                    m.housePackageTool?.molding?.title ||
                                    m?.housePackageTool?.stepProduct?.name ||
                                    m?.housePackageTool?.stepProduct?.product
                                        ?.title ||
                                    m?.description
                                );
                            case "unitPrice":
                                return formatCurrency.format(
                                    door ? door.unitPrice : (m.rate as any),
                                );
                            case "lineTotal":
                            case "totalPrice":
                                let total = door?.lineTotal || m.total;
                                if (!total && door?.unitPrice && door?.totalQty)
                                    total = door?.unitPrice * door.totalQty;
                                return formatCurrency.format(total);
                            case "lhQty":
                            case "rhQty":
                                return door?.[cell as any];
                            case "packing":
                                return packingInfo(data, m.id, door?.id);
                        }
                        return lines.length + 1;
                    };
                    if (is.moulding && !m.total) return;
                    if (is.moulding || is.service) {
                        lines.push(
                            res.cells.map((cell, _i) => {
                                const ret = {
                                    style: cell.cellStyle,
                                    colSpan: cell.colSpan,
                                    value: getVal(cell.cell),
                                };
                                return ret;
                            }),
                        );
                    } else {
                        m.housePackageTool?.doors?.map((door, _doorI) => {
                            const doorTitle =
                                // `${door.id}` +
                                door?.stepProduct?.name ||
                                door?.stepProduct?.door?.title ||
                                door?.stepProduct?.product?.title;

                            const isPh = m.formSteps.find((s) =>
                                s.value?.toLowerCase()?.startsWith("ph -"),
                            );
                            lines.push(
                                res.cells.map((cell, _cellId) => {
                                    const ret = {
                                        style: cell.cellStyle,
                                        colSpan: cell.colSpan,
                                        value: getVal(
                                            cell.cell,
                                            door,
                                            (isPh ? "PH - " : "") + doorTitle,
                                        ),
                                    };
                                    return ret;
                                }),
                            );
                        });
                    }
                });
                return {
                    _index: item?.meta?.lineIndex,
                    doorType: item.meta.doorType,
                    sectionTitle: item.dykeDescription || item.meta.doorType,
                    details: details,
                    itemCells: res.cells,
                    lines,
                    // : true
                    //     ? lines
                    //     : (is.moulding
                    //           ? []
                    //           : item.housePackageTool?.doors
                    //       )?.map((door, i) => {
                    //           return res.cells.map((cell, _i) => {
                    //               const ret = {
                    //                   style: cell.cellStyle,
                    //                   colSpan: cell.colSpan,
                    //                   value: door[cell.cell as any],
                    //               };
                    //               if (_i == 0) ret.value = i + 1;
                    //               const currency = ["Rate", "Total"].includes(
                    //                   cell.title
                    //               );
                    //               if (ret.value && currency) {
                    //                   ret.value = formatCurrency.format(
                    //                       ret.value
                    //                   );
                    //               }
                    //               return ret;
                    //           });
                    //       }),
                };
            }),
    };
    if (dt.doors.length) return dt;
    return null;
}

function lineItems(data: PrintData, { isProd, isPacking }) {
    const lineItems = data.order.items
        .filter((item) => !item.housePackageTool || !item.shelfItems)
        .map((item) => {
            if (!item.meta.uid && item.meta.line_index >= 0) {
                item.meta.uid = item.meta.line_index;
            }
            return item;
        });

    const uids = lineItems
        .map((item) => {
            let uid = item.meta.uid;

            return uid;
        })
        .filter((d) => d > -1);

    const maxIndex = Math.max(...uids);
    const totalLines = maxIndex ? maxIndex + 1 : lineItems?.length;

    if (totalLines < 0) return null;
    const heading = [
        header("#", 1),
        header("Description", 8),
        header("Swing", 2),
        header("Qty", 1),
    ];
    const noInvoice = isProd || isPacking;
    if (isPacking) heading.push(header("Packed Qty", 1));
    if (!noInvoice) heading.push(...[header("Rate", 2), header("Total", 2)]);
    let sn = 0;
    const lines = Array(totalLines)
        .fill(null)
        .map((_, index) => {
            const item = lineItems.find((item) => item.meta.uid == index);
            if (!item) return { cells: [] };

            const cells = [
                styled(item.rate ? `${++sn}.` : "", null, {
                    font: "bold",
                    colSpan: "1",
                    position: "center",
                }),
                styled(item.description, null, {
                    font: "bold",
                    bg: !item.rate ? "shade" : "default",
                    position: !item.rate ? "center" : "default",
                    text: "uppercase",
                    colSpan: "8",
                }),
                styled(item.swing, null, {
                    font: "bold",
                    position: "center",
                    text: "uppercase",
                    colSpan: "2",
                }),
                styled(item.qty, null, {
                    font: "bold",
                    position: "center",
                    colSpan: "1",
                }),
            ];
            if (!noInvoice)
                cells.push(
                    ...[
                        styled(
                            item.total
                                ? formatCurrency.format(item.rate || 0)
                                : null,
                            null,
                            {
                                position: "right",
                                colSpan: "2",
                            },
                        ),
                        styled(
                            !item.total
                                ? null
                                : formatCurrency.format(item.total || 0),
                            null,
                            {
                                font: "bold",
                                position: "right",
                                colSpan: "2",
                            },
                        ),
                    ],
                );
            if (isPacking)
                cells.push(
                    styled(packingInfo(data, item.id), "", {
                        font: "bold",
                        position: "center",
                    }),
                );
            return {
                id: item.id,
                total: item.total,
                colSpan: heading
                    .map((h) => h.colSpan)
                    .reduce((a, b) => a + b, 0),
                cells,
            };
        });
    if (lines.length)
        return {
            lines,
            heading,
        };
    return null;
}
function header(title, colSpan = 1) {
    return { title, colSpan };
}
function printFooter(data: PrintData, notPrintable) {
    if (notPrintable) return null;
    const totalPaid = sum(
        data.order.payments
            .filter((p) => !p.deletedAt && p.status == "success")
            .map((p) => p.amount),
    );
    let taxLines = [];
    if (data.order.taxes?.length) {
        data.order.taxes
            .filter((s) => !s.deletedAt)
            ?.filter((s, i) => i == 0)
            .map((t) => {
                const sData = salesData.salesTaxByCode[t.taxCode] as SalesTaxes;
                if (sData) {
                    taxLines.push(
                        styled(
                            `${sData.title} ${sData.percentage}%`,
                            formatCurrency.format(t.tax),
                            {
                                font: "bold",
                            },
                        ),
                    );
                } else {
                    taxLines.push(
                        styled(
                            `${
                                t.taxConfig
                                    ? `${t?.taxConfig?.title} ${t?.taxConfig?.percentage}%`
                                    : "Tax"
                            }`,
                            formatCurrency.format(t.tax),
                            {
                                font: "bold",
                            },
                        ),
                    );
                }
            });
    } else {
        if (data.order.tax)
            taxLines.push(
                styled(
                    `Tax (${data.order.taxPercentage}%)`,
                    formatCurrency.format(data.order.tax || 0),
                    {
                        font: "bold",
                    },
                ),
            );
    }
    return {
        lines: [
            styled(
                "Subtotal",
                formatCurrency.format(data.order.subTotal || 0),
                {
                    font: "bold",
                },
            ),
            ...taxLines,
            data.order.meta?.labor_cost
                ? styled(
                      "Labor",
                      formatCurrency.format(data.order.meta?.labor_cost || 0),
                      {
                          font: "bold",
                      },
                  )
                : null,
            ...data.order?.extraCosts?.map((ec) =>
                styled(ec.label, formatCurrency.format(ec.amount || 0), {
                    font: "bold",
                }),
            ),
            data.order.meta?.ccc
                ? styled(
                      "C.C.C",
                      formatCurrency.format(data.order.meta.ccc || 0),
                      {
                          font: "bold",
                      },
                  )
                : null,
            data.order.meta.deliveryCost > 0
                ? styled(
                      "Delivery",
                      `${formatCurrency.format(data.order.meta.deliveryCost)}`,
                      {
                          //   font: "bold",
                      },
                  )
                : null,
            totalPaid > 0
                ? styled(
                      "Total Paid",
                      `(${formatCurrency.format(totalPaid || 0)})`,
                      {
                          font: "bold",
                      },
                  )
                : null,
            styled(
                "Total Due",
                formatCurrency.format(data.order.amountDue || 0),
                {
                    font: "bold",
                    size: "base",
                },
            ),
            // styled("Total", formatCurrency.format(data.order.grandTotal || 0), {
            //     font: "bold",
            //     size: "base",
            // }),
        ].filter(Boolean),
    };
}

function heading({ mode, isOrder, order, isEstimate, isPacking }) {
    let h = {
        title: mode,
        lines: [
            styled(
                isOrder ? "Invoice #" : "Quote #",
                order.orderId?.toUpperCase(),
                {
                    font: "bold",
                    size: "lg",
                },
            ),
            styled(
                isOrder ? "Invoice Date" : "Quote Date",
                formatDate(order.createdAt),
            ),
            styled("Rep", order.salesRep?.name),
        ],
    };
    if (isEstimate) {
        h.lines.push(
            styled(
                "Good Until",
                order.goodUntil ? formatDate(order.goodUntil) : "-",
            ),
        );
    }
    // if (isOrder || isPacking)
    h.lines.push(styled("P.O No", order?.meta?.po, {}));

    if (isOrder && order.amountDue > 1) {
        h.lines.push(
            styled(
                "Invoice Status",
                (order.amountDue || 0) > 0 ? "Pending" : "Paid",
                {
                    size: "base",
                    font: "bold",
                    text: "uppercase",
                },
            ),
        );
        h.lines.push(
            styled("Invoice Total", formatCurrency.format(order?.grandTotal), {
                size: "base",
                font: "bold",
            }),
        );
        if (order?.amountDue > 0) {
            let { goodUntil, paymentTerm, createdAt } = order;
            if (paymentTerm)
                goodUntil = salesFormUtils._calculatePaymentTerm(
                    paymentTerm,
                    createdAt,
                );

            h.lines.push(
                styled("Due Date", goodUntil ? formatDate(goodUntil) : "-"),
            );
        }
    }
    return h;
}
function styled(title, value?, style?: PrintTextProps) {
    return {
        title,
        value,
        style: style || {},
    };
}
function address({ type, customer, billingAddress, shippingAddress }) {
    const estimate = type == "quote";
    return [
        addressLine(
            estimate ? "Customer" : "Sold To",
            customer?.businessName,
            billingAddress as any,
            customer,
        ),
        addressLine(
            estimate ? "Shipping Address" : "Ship To",
            customer?.businessName,
            shippingAddress as any,
            customer,
        ),
    ].filter(Boolean);
}
function addressLine(
    title,
    businessName,
    address: AddressBooks & { meta: IAddressMeta },
    customer: Customers & { meta: CustomerMeta },
) {
    return {
        title,
        lines:
            address || customer
                ? [
                      businessName || address?.name || customer?.name,
                      `${address?.phoneNo || customer?.phoneNo} ${
                          address?.phoneNo2 ? `(${address?.phoneNo2})` : ""
                      }`,
                      address?.email || customer?.email,
                      address?.address1 ||
                          address?.address2 ||
                          customer?.address,
                      [address?.city, address?.state, address?.meta?.zip_code]
                          ?.filter(Boolean)
                          ?.join(" "),
                  ].filter(Boolean)
                : ["No Address"],
    };
}
