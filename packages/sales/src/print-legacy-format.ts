import { SalesPdfToken } from "@gnd/utils/tokenizer";
import { Db, Prisma } from "@gnd/db";
import {
  calculatePaymentTerm,
  ftToIn,
  isComponentType,
  SalesIncludeAll,
} from "./utils/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { consoleLog, formatCurrency as _formatCurrency, sum } from "@gnd/utils";
import { AddressBookMeta, CustomerMeta } from "./types";
import { SalesPrintModes } from "./constants";

function formatCurrency(value) {
  const v = _formatCurrency(value);
  return `$${v}`;
}
export async function generateLegacyPrintData(
  db: Db,
  tokenData: SalesPdfToken
) {
  const sales = await db.salesOrders.findMany({
    include: SalesIncludeAll,
    where: {
      id: {
        in: tokenData.salesIds,
      },
    },
  });
  return sales?.map((s) => {
    const salesitems = composeSalesItems(s);
    const data = composePrint(
      {
        ...salesitems,
        order: s,
      },
      {
        mode: tokenData.mode as any,
        mockup: "no",
        dispatchId: tokenData.dispatchId,
      }
    );

    const {
      doors,
      address,
      footer,
      headerTitle,
      heading,
      isEstimate,
      isOrder,
      shelfItemsTable,
      orderedPrinting,
      paymentDate,
    } = data;
    return {
      pageData: {
        doors,
        address,
        footer,
        headerTitle,
        heading,
        isEstimate,
        isOrder,
        shelfItemsTable,
        orderedPrinting,
        paymentDate,
        order: {
          id: data?.order?.id,
        },
      },
      orderNo: s?.orderId,
    };
  });
}

// export type ViewSaleType = Prisma.SalesOrdersGetPayload<{
//     include: typeof SalesIncludeAll
// }>; // Awaited<ReturnType<typeof viewSale>>;
export type ViewSaleType = any;

export function composeSalesItems(data: ViewSaleType) {
  const housePakageTools: {
    [doorType: string]: {
      type: string;
      item: any;
      //   item: Omit<ViewSaleType["items"][0], "housePackageTool">;
      housePackageTools: any;
      //   housePackageTools: NonNullable<
      //     ViewSaleType["items"][0]["housePackageTool"]
      //   >[];
    };
  } = {};
  const shelfItems: any[] = [];
  //   const shelfItems: NonNullable<ViewSaleType["items"][0]["shelfItems"]> = [];
  let totalDoors = 0;

  data.items.map((item) => {
    if (item.housePackageTool) {
      const tool = item.housePackageTool;
      const dt = tool.doorType as string;

      if (!housePakageTools[dt])
        housePakageTools[dt] = {
          type: dt,
          housePackageTools: [],
          item,
        };

      housePakageTools[dt]?.housePackageTools?.push(item.housePackageTool);
      totalDoors += item.housePackageTool?.totalDoors || 0;
    }
    if (item.shelfItems) shelfItems.push(...item.shelfItems);
  });

  return {
    shelfItems,
    totalDoors,
    housePackageTools: data.items
      .filter((item) => item.housePackageTool)
      .map((item) => {
        return {
          doorType: item.housePackageTool?.doorType,
          doorDetails: composeDoorDetails(item.formSteps, item),
          doors: item.housePackageTool?.doors.map((door) => {
            return {
              dimension: door.dimension,
              lhQty: door.lhQty,
              rhQty: door.rhQty,
              unitPrice: door.unitPrice,
              totalPrice: door.lineTotal,
            };
          }),
        };
      }),
    doors: Object.values(housePakageTools),
  };
}

export function composeDoorDetails(
  steps: ViewSaleType["items"][0]["formSteps"],
  item: ViewSaleType["items"][0]
) {
  if (!steps) steps = [];

  let _steps = steps
    .filter(
      (s) => !["Door", "Item Type", "Moulding"].some((k) => k == s.step.title)
    )
    .map((fs) => {
      return {
        title: fs.step.title,
        value: fs.value,
      };
    });
  // _steps.push({
  //     title: "----",
  //     value: "####",
  // });
  // if (item.housePackageTool?.doorType == "Moulding") {

  //     _steps.push(
  //         ...[
  //             {
  //                 title: "Qty",
  //                 value: `$ 100`,
  //             },
  //         ]
  //     );
  // }
  return _steps;
}

type PrintData = {
  order: ViewSaleType;
  isEstimate?: boolean;
  isProd?: boolean;
  isPacking?: boolean;
  isOrder?: boolean;
  query?: Query; //SalesPrintProps["searchParams"];
  dispatchNote?: any;
} & ReturnType<typeof composeSalesItems>;

type PrintStyles = "base" | "lg-bold";
interface Query {
  //   slugs?: string;
  mode: SalesPrintModes;
  mockup?: "yes" | "no";
  //   preview?: boolean;
  //   pdf?: boolean;
  //   deletedAt?;
  dispatchId?;
}
export function composePrint(
  data: PrintData,
  query: Query // SalesPrintProps["searchParams"],
) {
  data = {
    ...data,
    query,
    isEstimate: query.mode == "quote",
    isProd: query.mode == "production",
    isPacking: query.mode == "packing list",
    isOrder: query.mode == "order",
  };
  // data.order.paymentDueDate
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
  data: PrintData
) {
  const price = !isProd && !isPacking;
  // keyof DykeSalesDoors
  type T = keyof any;
  const res = {
    cells: [
      _cell<T>("#", null, 1, "text-center", "text-center"),
      _cell<T>(
        "Item",
        "description",
        // price ? 7 : isPacking ? 11 : 14,
        null as any,
        "text-left",
        "text-left"
      ),
      _cell<T>("Qty", "qty", 1.2, "text-center", "text-center"),
    ],
  };
  if (price)
    res.cells.push(
      ...[
        _cell<T>("Rate", "unitPrice", 3.5, "text-right", "text-right"),
        _cell<T>(
          "Total",
          "totalPrice",
          3.5,
          "text-right",
          "text-right font-bold"
        ),
      ]
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
          composeShelfItem<typeof res.cells>(res.cells, shelfItem, itemIndex)
        ),
      };
    });
  return newResp;
  const dt = {
    ...res,
    items: data.shelfItems.map((item, itemIndex) => {
      return composeShelfItem<typeof res.cells>(res.cells, item, itemIndex);
    }),
  };
  // if (!dt.items.length) return null;
  // return dt;
}
function composeShelfItem<T>(
  cells: T,
  shelfItem,
  itemIndex
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
    if (_i > 2 && ret.value) ret.value = formatCurrency(ret.value);
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
  style?: any,
  cellStyle?: any
) {
  return { title, cell, colSpan, style, cellStyle };
}
function packingInfo(data: PrintData, itemId, doorId?) {
  const deliveryId = data?.query?.dispatchId;
  if (!data.isPacking || !deliveryId) return null;
  const deliveries = data.order.deliveries;
  const deliv = deliveries.find((d) => d.id == deliveryId);
  let items =
    deliveryId == "all" ? deliveries?.map((d) => d.items).flat() : deliv?.items;
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
    if (deliveryId != "all") boooleans.push(item.orderDeliveryId == deliveryId);
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
  let texts: string[] = [];
  if (sumLh) texts.push(`${sumLh} LH`);
  if (sumRh) texts.push(`${sumRh} RH`);
  if (!sumLh && !sumRh && sumQty) texts.push(`${sumQty}`);
  return texts.join(` & `);
}
function getDoorsTable(
  { isProd, isPacking, isOrder, isEstimate },
  data: PrintData
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
          item?.meta?.doorType === "Mouldings"
      )
      .filter(
        (item) => !item.multiDykeUid || (item.multiDykeUid && item.multiDyke)
      )
      .map((item) => {
        const doorType = item.meta.doorType;

        const is = isComponentType(doorType);

        const noHandle = !!item.configs
          ? item.configs?.noHandle
          : is.bifold || is.service || is.slab;
        const hasSwing = item.configs
          ? item.configs.hasSwing
          : !is.bifold && !is.service;
        consoleLog(".....", { noHandle, doorType, is, configs: item.configs });
        const res = {
          cells: [
            _cell("#", null, 1, "text-center", "text-center"),

            ...(is.moulding
              ? [
                  _cell(
                    "Items",
                    "moulding",
                    // price ? 4 : isPacking ? 7 : 10,
                    null as any,
                    { position: "left" },
                    { position: "left" }
                  ),
                  _cell("Qty", "qty", 1.5, "text-center", "text-center"),
                ]
              : [
                  ...(is.service
                    ? [
                        _cell(
                          "Description",
                          "description",
                          // price ? 4 : isPacking ? 7 : 10,
                          null as any,
                          { position: "left" },
                          { position: "left" }
                        ),
                      ]
                    : [
                        _cell(
                          "Door",
                          "door",
                          // price ? 4 : isPacking ? 7 : 10,
                          null as any,
                          { position: "left" },
                          { position: "left" }
                        ),
                        _cell(
                          "Size",
                          "dimension",
                          3,
                          { position: "left" },
                          { position: "left" }
                        ),
                      ]),
                  ...(is.garage ? [_cell("Swing", "swing", 2, {}, {})] : []),
                  ...// is.bifold || is.slab || is.service
                  (noHandle
                    ? [_cell("Qty", "qty", 1.5, "text-center", "text-center")]
                    : [
                        _cell("LH", "lhQty", 1.5, "text-center", "text-center"),
                        _cell("RH", "rhQty", 1.5, "text-center", "text-center"),
                      ]),
                ]),
          ],
        };
        if (price) {
          res.cells.push(
            ...[
              _cell("Rate", "unitPrice", 3, "text-right", "text-right"),
              _cell(
                "Total",
                "lineTotal",
                3,
                "text-right",
                "text-right font-bold"
              ),
            ]
          );
        }
        if (isPacking)
          res.cells.push(
            _cell(
              "Shipped Qty",
              "packing",
              3,
              "text-center",
              "text-center font-bold"
            )
          );

        const details =
          is.moulding || is.bifold
            ? []
            : [
                ...item.formSteps.filter(
                  (t) =>
                    !["Door", "Item Type", "Moulding"].some(
                      (s) => s == t.step.title
                    )
                ),
              ].map((v) => {
                v.step.title = transformStepTitle(v.step.title);
                return v;
              });
        const lines: any = [];
        const _multies = data.order.items.filter(
          (i) =>
            (!item.multiDyke && i.id == item.id) ||
            (item.multiDyke && item.multiDykeUid == i.multiDykeUid)
        );
        _multies.map((m, _) => {
          const getVal = (cell: Cell, door?: any, doorTitle?) => {
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
                  ?.map((a) => ftToIn(a?.trim())?.replaceAll("in", '"'))
                  .join(" x ");
                if (!price) return door.dimension;
                return dimIn;
              //  return [`${door.dimension}`, `(${dimIn})`];

              case "moulding":
                return (
                  m.housePackageTool?.molding?.title ||
                  m?.housePackageTool?.stepProduct?.name ||
                  m?.housePackageTool?.stepProduct?.product?.title ||
                  m?.description
                );
              case "unitPrice":
                return formatCurrency(door ? door.unitPrice : (m.rate as any));
              case "lineTotal":
              case "totalPrice":
                let total = door?.lineTotal || m.total;
                if (!total && door?.unitPrice && door?.totalQty)
                  total = door?.unitPrice * door.totalQty;
                return formatCurrency(total);
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
              })
            );
          } else {
            m.housePackageTool?.doors?.map((door, _doorI) => {
              const doorTitle =
                // `${door.id}` +
                door?.stepProduct?.name ||
                door?.stepProduct?.door?.title ||
                door?.stepProduct?.product?.title;

              const isPh = m.formSteps.find((s) =>
                s.value?.toLowerCase()?.startsWith("ph -")
              );
              lines.push(
                res.cells.map((cell, _cellId) => {
                  const ret = {
                    style: cell.cellStyle,
                    colSpan: cell.colSpan,
                    value: getVal(
                      cell.cell,
                      door,
                      (isPh ? "PH - " : "") + doorTitle
                    ),
                  };
                  return ret;
                })
              );
            });
          }
        });
        return {
          _index: item?.meta?.lineIndex,
          doorType: item.meta.doorType,
          sectionTitle: item.dykeDescription || item.meta.doorType,
          details,
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
      consoleLog("META: ", item.meta);
      return uid;
    })
    .filter((d) => d > -1);

  const maxIndex = Math.max(...uids);
  const totalLines = maxIndex ? maxIndex + 1 : lineItems?.length;

  consoleLog("COMPOSING LINES", { totalLines, uids, maxIndex });
  if (totalLines < 0) return null;
  const heading = [
    header("#", 1),
    header("Description", null as any),
    header("Swing", 2),
    header("Qty", 1),
  ];
  const noInvoice = isProd || isPacking;
  if (isPacking) heading.push(header("Packed Qty", 1));
  if (!noInvoice) heading.push(...[header("Rate", 3), header("Total", 3)]);
  let sn = 0;

  const lines = Array(totalLines)
    .fill(null)
    .map((_, index) => {
      const item = lineItems.find((item) => item.meta.uid == index);
      if (!item) return { cells: [] };

      const cells = [
        styled(item.rate ? `${++sn}.` : "", null, "font-bold text-center"),
        styled(
          item.description,
          null,
          `font-bold ${!item.rate ? "bg-shade" : ""} ${
            !item.rate ? "text-center" : ""
          } uppercase `
        ),
        styled(item.swing, null, "font-bold text-center uppercase"),
        styled(item.qty, null, "font-bold text-center"),
      ];
      if (!noInvoice)
        cells.push(
          ...[
            styled(
              item.total ? formatCurrency(item.rate || 0) : null,
              null,
              "text-right"
            ),
            styled(
              !item.total ? null : formatCurrency(item.total || 0),
              null,
              "font-bold text-right"
            ),
          ]
        );
      if (isPacking)
        cells.push(
          styled(packingInfo(data, item.id), "", "font-bold text-center")
        );
      return {
        id: item.id,
        total: item.total,
        colSpan: heading.map((h) => h.colSpan).reduce((a, b) => a + b, 0),
        cells,
      };
    });

  consoleLog("LINE ITEMS::", { lines });
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
      .map((p) => p.amount)
  );
  let taxLines: any[] = [];
  if (data.order.taxes?.length) {
    data.order.taxes
      .filter((s) => !s.deletedAt)
      ?.filter((s, i) => i == 0)
      .map((t) => {
        const sData = salesTaxByCode[t.taxCode] as any;
        if (sData) {
          taxLines.push(
            styled(
              `${sData.title} ${sData.percentage}%`,
              formatCurrency(t.tax),
              "font-bold"
            )
          );
        } else {
          taxLines.push(
            styled(
              `${
                t.taxConfig
                  ? `${t?.taxConfig?.title} ${t?.taxConfig?.percentage}%`
                  : "Tax"
              }`,
              formatCurrency(t.tax),
              "font-bold"
            )
          );
        }
      });
  } else {
    if (data.order.tax)
      taxLines.push(
        styled(
          `Tax (${data.order.taxPercentage}%)`,
          formatCurrency(data.order.tax || 0),
          "font-bold"
        )
      );
  }
  return {
    lines: [
      styled("Subtotal", formatCurrency(data.order.subTotal || 0), "font-bold"),
      ...taxLines,
      data.order.meta?.labor_cost
        ? styled(
            "Labor",
            formatCurrency(data.order.meta?.labor_cost || 0),
            "font-bold"
          )
        : null,
      ...data.order?.extraCosts?.map((ec) =>
        styled(ec.label, formatCurrency(ec.amount || 0), "font-bold")
      ),
      data.order.meta?.ccc
        ? styled("C.C.C", formatCurrency(data.order.meta.ccc || 0), "font-bold")
        : null,
      data.order.meta.deliveryCost > 0
        ? styled(
            "Delivery",
            `${formatCurrency(data.order.meta.deliveryCost)}`,
            ""
          )
        : null,
      totalPaid > 0
        ? styled(
            "Total Paid",
            `(${formatCurrency(totalPaid || 0)})`,
            "font-bold"
          )
        : null,
      styled(
        "Total Due",
        formatCurrency(data.order.amountDue || 0),
        "text-base font-bold"
      ),
      // styled("Total", formatCurrency.format(data.order.grandTotal || 0), {
      //     "font-bold",
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
        "font-bold size-lg"
      ),
      styled(
        isOrder ? "Invoice Date" : "Quote Date",
        formatDate(order.createdAt)
      ),
      styled("Rep", order.salesRep?.name),
    ],
  };
  if (isEstimate) {
    h.lines.push(
      styled("Good Until", order.goodUntil ? formatDate(order.goodUntil) : "-")
    );
  }
  // if (isOrder || isPacking)
  h.lines.push(styled("P.O No", order?.meta?.po, {}));

  if (isOrder && order.amountDue > 1) {
    h.lines.push(
      styled(
        "Invoice Status",
        (order.amountDue || 0) > 0 ? "Pending" : "Paid",
        "text-base font-bold uppercase"
      )
    );
    h.lines.push(
      styled(
        "Invoice Total",
        formatCurrency(order?.grandTotal),
        "text-base font-bold"
      )
    );
    if (order?.amountDue > 0) {
      let { goodUntil, paymentTerm, createdAt } = order;
      if (paymentTerm)
        if (paymentTerm != "None")
          goodUntil = calculatePaymentTerm(paymentTerm, createdAt);
        // salesFormUtils._calculatePaymentTerm(
        //             paymentTerm,
        //             createdAt,
        //         );
        else goodUntil = order.paymentDueDate;
      h.lines.push(styled("Due Date", goodUntil ? formatDate(goodUntil) : "-"));
    }
  }
  return h;
}
function styled(title, value?, style?: any) {
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
      customer
    ),
    addressLine(
      estimate ? "Shipping Address" : "Ship To",
      customer?.businessName,
      shippingAddress as any,
      customer
    ),
  ].filter(Boolean);
}
function addressLine(
  title,
  businessName,
  address: any & { meta: AddressBookMeta },
  customer: any & { meta: CustomerMeta }
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
            address?.address1 || address?.address2 || customer?.address,
            [address?.city, address?.state, address?.meta?.zip_code]
              ?.filter(Boolean)
              ?.join(" "),
          ].filter(Boolean)
        : ["No Address"],
  };
}
const salesTaxes = [
  { code: "A", title: "County Tax", percentage: 1, on: "first 5000" },
  { code: "B", title: "Florida State Tax", percentage: 6, on: "total" },
] as const;
export type SalesTaxes = (typeof salesTaxes)[number];
export type TaxCodes = SalesTaxes["code"];

const salesTaxByCode: { [id in TaxCodes]: SalesTaxes } = {
  A: salesTaxes[0],
  B: salesTaxes[1],
};

function transformStepTitle(t) {
  return (
    {
      "door configuration": "Config",
    }[t?.toLowerCase()?.split(" ")?.filter(Boolean)?.join(" ")] || t
  );
}
