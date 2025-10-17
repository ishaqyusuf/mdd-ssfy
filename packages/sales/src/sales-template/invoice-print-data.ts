import {
  calculatePaymentTerm,
  ftToIn,
  isComponentType,
  SalesIncludeAll,
} from "../utils/utils";
import {
  AddressBookMeta,
  Db,
  PrintData,
  PrintDataTable,
  PrintLineSection,
  Prisma,
  SalesItemMeta,
  SalesMeta,
  StepComponentMeta,
  TableHeaders,
} from "../types";
import { formatDate } from "@gnd/utils/dayjs";
import { formatCurrency, formatMoney, sum } from "@gnd/utils";
import { getSalesSetting, SalesSetting } from "../exports";
import { z } from "zod";
import { INVOICE_PRINT_MODES } from "../constants";
import { CSSProperties } from "react";
export const printInvoiceSchema = z.object({
  ids: z.array(z.number()).optional().nullable(),
  slugs: z.array(z.string()).optional().nullable(),
  mode: z.enum(INVOICE_PRINT_MODES),
  access: z.enum(["internal", "public"]),
  type: z.enum(["quote", "order"]),
  dispatchId: z.number().optional().nullable(),
  noCostBreakDown: z.boolean().optional().nullable(),
  hideCost: z.boolean().optional().nullable(),
});
export type PrintInvoice = z.infer<typeof printInvoiceSchema>;
type Data = Prisma.SalesOrdersGetPayload<{
  include: typeof SalesIncludeAll;
}>;
let setting: SalesSetting;
let query: PrintInvoice;
export async function getInvoicePrintData(db: Db, _query: PrintInvoice) {
  //   _query.mode = "customer" as any;
  _query.noCostBreakDown = _query.access != "internal";
  _query.hideCost =
    _query.mode == "packing slip" || _query.mode == "production";
  query = _query;
  const sales = await loadInvoiceData(db, query);
  setting = await getSalesSetting(db);
  const printList = sales.map((v) => transformSalesPrint(v));
  return printList;
}

export async function loadInvoiceData(db: Db, query: PrintInvoice) {
  const where: Prisma.SalesOrdersWhereInput = {
    type: query.type,
  };
  if (query.ids)
    where.id = {
      in: query.ids,
    };
  if (query.slugs)
    where.orderId = {
      in: query.slugs!,
    };
  const sales = await db.salesOrders.findMany({
    where,
    include: SalesIncludeAll,
  });
  return sales;
}

type DataItem = Data["items"][number];
function metaData(data: Data): PrintData["meta"] {
  const isQuote = query.mode == "quote";
  function detail(label, value, style?: CSSProperties) {
    const _ctx = {
      data: {
        label: label,
        value: value,
        style,
      },
    };
    return _ctx.data;
  }
  const details = [
    detail(isQuote ? "Quote #" : "Invoice #", data.orderId, {
      fontWeight: "bold",
      fontSize: "20px",
    }),
    detail(isQuote ? "Quote Date" : "Invoice Date", formatDate(data.createdAt)),
    detail("P.O No.", (data.meta as any as SalesMeta)?.po!),
    detail("Invoice Status", data.amountDue! > 0 ? "Pending" : "Paid"),
    detail("Invoice Total", formatCurrency(data?.grandTotal), {
      fontWeight: "bold",
      fontSize: "20px",
    }),
  ];
  if (data.amountDue! > 0) {
    let { goodUntil, paymentTerm, createdAt } = data;
    if (paymentTerm) goodUntil = calculatePaymentTerm(paymentTerm, createdAt);
    details.push(detail("Due Date", goodUntil ? formatDate(goodUntil) : " - "));
  }
  return {
    title: (
      {
        invoice: "Invoice",
        "packing slip": "Packing Slip",
        production: "Production",
        quote: "Quote",
      } as { [k in typeof query.mode]: string }
    )[query.mode],
    details,
  };
}
function transformSalesPrint(data: Data) {
  const res: PrintData = {
    meta: metaData(data),
    label: query.mode as any,
    billing: addressLines(
      data.customer,
      data.billingAddress,
      data.customer?.businessName!
    ),
    shipping: addressLines(data.customer, data.shippingAddress),
    date: formatDate(data.createdAt),
    salesRep: data?.salesRep?.name!,
    poNo: (data.meta as any as SalesMeta)?.po!,
    total: `${formatMoney(data.grandTotal)}`,
    due: data.amountDue ? `$${formatMoney(data.amountDue)}` : undefined,
    type: query.type,
    linesSection: [],
    salesNo: data.orderId,
    id: data.id,
  };
  // dyke transform
  data.items
    .filter(
      (item) =>
        data.isDyke &&
        (!item.multiDykeUid || (item.multiDykeUid && item.multiDyke))
    )
    .map((item) => {
      // shelf items...
      if (item.shelfItems?.length) {
        const itemMeta = item!.meta as any as SalesItemMeta;
        const section: PrintLineSection = {
          index: itemMeta?.lineIndex,
          title: item.dykeDescription || "Shelf Items",
          tableHeader: [
            tableHeader("#", "xs", "center"),
            tableHeader("Description"),
            tableHeader("Qty", "xs", "center"),
            query.hideCost ||
              query.noCostBreakDown ||
              tableHeader("Rate", "sm", "end"),
            query.hideCost ||
              query.noCostBreakDown ||
              tableHeader("Total", "sm", "end"),
          ]!
            ?.filter((a) => !!a && typeof a === "object")
            .map((b) => b!) as any,
          tableRows: item.shelfItems.map((sItem) => {
            const row: PrintLineSection["tableRows"][number] = {} as any;
            row["Rate"] = cell(formatCurrency(sItem.unitPrice));
            row["Total"] = cell(formatCurrency(sItem.totalPrice));
            // TODO: SHELF ITEM SHIPPING
            // row["Shipped Qty"] = cell(
            //   linePackingInfo(data, mItem.id, door?.id)
            // );
            row.Description = cell(sItem.description);
            row.Qty = cell(sItem.qty);
            return row;
          }),
        };
        res.linesSection.push(section);
        return;
      }
      const composed = composeDykeItems(item, data);
      const { is, noHandle, itemMeta } = composed;
      const isDoor = !is.moulding && !is.service;

      const section: PrintLineSection = {
        index: itemMeta?.lineIndex,
        title: item?.dykeDescription || itemMeta?.doorType,
        tableHeader: [
          tableHeader("#", "xs", "center"),
          !is.moulding || tableHeader("Moulding"),
          //   !is.moulding || tableHeader("Qty", "xs", "center"),
          !is.service || tableHeader("Description"),
          !isDoor || tableHeader("Door"),
          !isDoor || tableHeader("Size", "sm"),
          !is.garage || tableHeader("Swing", "sm"),
          ...(noHandle
            ? [tableHeader("Qty", "xs", "center")]
            : [
                tableHeader("Left Hand", "sm", "center"),
                tableHeader("Right Hand", "sm", "center"),
              ]),
          query.hideCost ||
            query.noCostBreakDown ||
            tableHeader("Rate", "sm", "end"),
          query.hideCost ||
            query.noCostBreakDown ||
            tableHeader("Total", "sm", "end"),
        ]!
          ?.filter((a) => !!a && typeof a === "object")
          .map((b) => b!) as any,
        configurations:
          is.moulding || is.bifold
            ? []
            : item.formSteps
                .filter(
                  (t) =>
                    !["Door", "Item Type", "Moulding"].some(
                      (s) => s == t.step.title
                    )
                )
                .map((conf) => ({
                  label: conf.step?.title!,
                  value: conf.component?.name! || conf?.value!,
                })),
        tableRows: composed?.items
          .map((mItem) => {
            const row: PrintLineSection["tableRows"][number] = {} as any;
            if (is.moulding || is.service) {
              row.Description = cell(mItem.description);
              row.Qty = cell(mItem.qty);
              row["Rate"] = cell(formatCurrency(mItem?.rate!));
              row["Total"] = cell(formatCurrency(mItem?.total));
              row["Moulding"] = cell(
                mItem.housePackageTool?.molding?.title ||
                  mItem?.housePackageTool?.stepProduct?.name ||
                  mItem?.housePackageTool?.stepProduct?.product?.title
              );
              row["Shipped Qty"] = cell(linePackingInfo(data, mItem.id));
              return [row];
            } else {
              return mItem.housePackageTool?.doors?.map((door) => {
                const row: PrintLineSection["tableRows"][number] = {} as any;
                const doorTitle =
                  // `${door.id}` +
                  door?.stepProduct?.name ||
                  door?.stepProduct?.door?.title ||
                  door?.stepProduct?.product?.title;
                row.Swing = cell(door?.swing);
                const isPh = mItem.formSteps.find((s) =>
                  s.value?.toLowerCase()?.startsWith("ph -")
                );
                row.Qty = cell(door?.lhQty || mItem?.qty);
                row.Door = cell(`${isPh ? "PH - " : ""}${doorTitle}`);
                row["Left Hand"] = cell(door?.lhQty);
                row["Right Hand"] = cell(door?.rhQty);
                row["Rate"] = cell(formatCurrency(door?.unitPrice!));
                row["Total"] = cell(
                  formatCurrency(
                    door?.lineTotal || sum([door?.unitPrice! * door?.totalQty!])
                  )
                );
                const dimIn = door?.dimension
                  ?.split("x")
                  ?.map((a) => ftToIn(a?.trim())?.replaceAll("in", '"'))
                  .join(" x ");
                const dims = [`${door.dimension}`, `(${dimIn})`];
                row.Size = cell(dims);
                row["Shipped Qty"] = cell(
                  linePackingInfo(data, mItem.id, door?.id)
                );
                return row;
              });
            }
          })
          .flat()
          .map((a, i) => {
            a!["#"] = cell(i + 1);
            return a!;
          }),
      };
      res.linesSection.push(section);
    });
  // res.linesSection = res.linesSection.map(l => l.)
  return res;
}
function cell(value, bold?: boolean): PrintDataTable {
  return {
    text: Array.isArray(value) ? value : [value],
    bold,
  };
}
function linePackingInfo(sale: Data, itemId, doorId?) {
  const deliveryId = query.dispatchId;
  if (!deliveryId) return null;
  const deliveries = sale.deliveries;
  const deliv = deliveries.find((d) => d.id == deliveryId);
  let items =
    deliveryId == -1 ? deliveries?.map((d) => d.items).flat() : deliv?.items;
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
    if (deliveryId != -1) boooleans.push(item.orderDeliveryId == deliveryId);
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
function composeDykeItems(item: DataItem, data: Data) {
  const _multies = data.items.filter(
    (i) =>
      (!item.multiDyke && i.id == item.id) ||
      (item.multiDyke && item.multiDykeUid == i.multiDykeUid)
  );
  const itemMeta = item!.meta as any as SalesItemMeta;
  const doorType = itemMeta?.doorType;
  const ovs = item.formSteps
    ?.map(
      (fs) => (fs.component?.meta as any as StepComponentMeta)?.sectionOverride
    )
    ?.filter(Boolean);
  const sectionOverride = ovs.find((s) => s!.overrideMode);
  const rootStep = item.formSteps.find((fs) => fs.step.title == "Item Type");
  const rootConfig = setting?.data?.route?.[rootStep?.prodUid!]?.config;
  const config = sectionOverride
    ? sectionOverride
    : rootConfig
      ? rootConfig
      : null;
  const is = isComponentType(doorType);
  const noHandle = config
    ? config?.noHandle
    : !is.bifold && !is.service && !is.slab;
  const hasSwing = config ? config.hasSwing : !is.bifold && !is.service;
  return {
    items: _multies,
    hasSwing,
    noHandle,
    type: doorType,
    is,
    itemMeta,
  };
}
function tableHeader(
  label: TableHeaders,
  width?: PrintDataTable["width"],
  align: PrintDataTable["align"] = "start"
): PrintDataTable {
  return {
    text: [label],
    width,
    align,
    bold: true,
  };
}
function addressLines(
  customer: Data["customer"],
  address: Data["billingAddress"],
  businessName?: string
) {
  const meta = address!?.meta as any as AddressBookMeta;
  return (
    address || customer
      ? [
          businessName || address?.name || customer?.name,
          `${address?.phoneNo || customer?.phoneNo} ${
            address?.phoneNo2 ? `(${address?.phoneNo2})` : ""
          }`,
          address?.email || customer?.email,
          address?.address1 || address?.address2 || customer?.address,
          [address?.city, address?.state, meta?.zip_code]
            ?.filter(Boolean)
            ?.join(" ")!,
        ]!.filter(Boolean)
      : ["No Address"]
  ).map((a) => a!);
}
