import { generateRandomString } from "@gnd/utils";
import {
  divideMoney,
  multiplyMoney,
  roundMoney,
  subtractMoney,
  sumMoney,
} from "../../payment-system/domain/money";
import { readSalesFormObjectMetadata } from "./metadata";
import { normalizeSalesFormTitle } from "./step-engine";

type GroupKind = "moulding" | "service";

function roundCurrency(value: number) {
  return roundMoney(value);
}

function authoritativeGroupPricing(lineTotal: number, qtyTotal: number) {
  const unitPrice = qtyTotal > 0 ? divideMoney(lineTotal, qtyTotal) : 0;
  return {
    unitPrice,
    rateRoundingAdjustment: subtractMoney(
      lineTotal,
      multiplyMoney(unitPrice, qtyTotal),
    ),
    totalAuthoritative: true as const,
  };
}

function safeRecord(value: unknown): Record<string, any> {
  return readSalesFormObjectMetadata(value) || {};
}

function getLineMetaRows(line: any, key: "mouldingRows" | "serviceRows") {
  const meta = safeRecord(line?.meta);
  return Array.isArray(meta[key]) ? meta[key] : [];
}

function getLineItemTypeTitle(line: any) {
  const itemTypeStep = (line?.formSteps || []).find(
    (step: any) => normalizeSalesFormTitle(step?.step?.title) === "item type",
  );
  return String(itemTypeStep?.value || "").trim();
}

function isMouldingTitle(value?: string | null) {
  const normalized = normalizeSalesFormTitle(value);
  return (
    normalized === "moulding" ||
    normalized === "mouldings" ||
    normalized === "molding" ||
    normalized === "moldings"
  );
}

function isServiceTitle(value?: string | null) {
  const normalized = normalizeSalesFormTitle(value);
  return normalized === "service" || normalized === "services";
}

function findLineStepByTitle(line: any, title: string) {
  const normalized = normalizeSalesFormTitle(title);
  return (line?.formSteps || []).find(
    (step: any) => normalizeSalesFormTitle(step?.step?.title) === normalized,
  );
}

export function isGroupedMouldingLine(line: any) {
  const itemType = getLineItemTypeTitle(line);
  return (
    isMouldingTitle(itemType) ||
    isMouldingTitle(line?.title) ||
    getLineMetaRows(line, "mouldingRows").length > 0
  );
}

export function isGroupedServiceLine(line: any) {
  const itemType = getLineItemTypeTitle(line);
  return (
    isServiceTitle(itemType) ||
    isServiceTitle(line?.title) ||
    getLineMetaRows(line, "serviceRows").length > 0
  );
}

function summarizeServiceRows(rows: Array<Record<string, any>>) {
  const normalizedRows = rows.map((row, index) => {
    const qty = Number(row.qty || 0);
    const unitPrice = Number(row.unitPrice || 0);
    return {
      ...row,
      uid: String(row.uid || "").trim() || `legacy-service-row-${index + 1}`,
      service: String(row.service || row.description || "").trim(),
      taxxable: Boolean(row.taxxable),
      produceable: Boolean(row.produceable),
      qty,
      unitPrice,
      lineTotal: multiplyMoney(qty, unitPrice),
    };
  });
  const qtyTotal = normalizedRows.reduce(
    (sum, row) => sum + Number(row.qty || 0),
    0,
  );
  const lineTotal = sumMoney(
    normalizedRows.map((row) => Number(row.lineTotal || 0)),
  );
  return {
    rows: normalizedRows,
    qtyTotal,
    lineTotal,
    ...authoritativeGroupPricing(lineTotal, qtyTotal),
    description: normalizedRows
      .map((row) => String(row.service || "").trim())
      .filter(Boolean)
      .join(" | "),
  };
}

function summarizeMouldingRows(rows: Array<Record<string, any>>) {
  const normalizedRows = rows.map((row, index) => {
    const qty = Number(row.qty || 0);
    const salesPrice = Number(row.salesPrice || 0);
    const addon = Number(row.addon || 0);
    const customPrice =
      row.customPrice == null || row.customPrice === ""
        ? null
        : Number(row.customPrice || 0);
    const unit = customPrice == null ? salesPrice + addon : customPrice + addon;
    return {
      ...row,
      uid: String(row.uid || "").trim() || `legacy-moulding-row-${index + 1}`,
      title: String(row.title || row.description || "Moulding").trim(),
      description: String(row.description || row.title || "Moulding").trim(),
      qty,
      addon,
      customPrice,
      salesPrice,
      basePrice: Number(row.basePrice || 0),
      lineTotal: multiplyMoney(qty, unit),
      stepProductId: row.stepProductId ?? null,
    };
  });
  const qtyTotal = normalizedRows.reduce(
    (sum, row) => sum + Number(row.qty || 0),
    0,
  );
  const lineTotal = sumMoney(
    normalizedRows.map((row) => Number(row.lineTotal || 0)),
  );
  return {
    rows: normalizedRows,
    qtyTotal,
    lineTotal,
    ...authoritativeGroupPricing(lineTotal, qtyTotal),
    description: normalizedRows
      .map((row) => String(row.description || row.title || "").trim())
      .filter(Boolean)
      .join(" | "),
  };
}

function classifyLegacyGroup(siblings: any[]): GroupKind | null {
  const representative =
    siblings.find((item) => Boolean(item?.multiDyke)) || siblings[0];
  const representativeTitle = String(representative?.title || "").trim();
  const itemTypeTitle = getLineItemTypeTitle(representative);
  const groupedMoulding =
    siblings.some((item) => Number(item?.housePackageTool?.moldingId || 0) > 0) ||
    isMouldingTitle(itemTypeTitle) ||
    isMouldingTitle(representativeTitle);
  if (groupedMoulding) return "moulding";
  const groupedService =
    isServiceTitle(itemTypeTitle) || isServiceTitle(representativeTitle);
  return groupedService ? "service" : null;
}

export function collapseLegacyGroupedLines<T extends Record<string, any>>(
  rawLines: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const line of rawLines) {
    const groupUid = String(line?.multiDykeUid || "").trim();
    if (!groupUid) continue;
    const siblings = groups.get(groupUid) || [];
    siblings.push(line);
    groups.set(groupUid, siblings);
  }

  const consumed = new Set<string>();
  return rawLines.flatMap((line) => {
    const groupUid = String(line?.multiDykeUid || "").trim();
    if (!groupUid) return [line];
    if (consumed.has(groupUid)) return [];

    const siblings = groups.get(groupUid) || [line];
    const kind = classifyLegacyGroup(siblings);
    if (!kind) return [line];

    consumed.add(groupUid);
    const representative =
      siblings.find((item) => Boolean(item?.multiDyke)) || siblings[0];

    if (kind === "service") {
      const serviceRows = siblings.map((item, index) => {
        const itemMeta = safeRecord(item?.meta);
        return {
          salesItemId: item?.id ?? null,
          groupUid,
          primaryGroupItem: Boolean(item?.multiDyke) || index === 0,
          uid: String(item?.uid || "").trim() || `legacy-service-${index + 1}`,
          service: String(item?.description || "").trim(),
          taxxable: Boolean(item?.sourceMeta?.tax ?? itemMeta.taxxable),
          produceable: Boolean(item?.dykeProduction ?? itemMeta.produceable),
          qty: Number(item?.qty || 0),
          unitPrice: Number(item?.unitPrice || 0),
        };
      });
      const summary = summarizeServiceRows(serviceRows);
      return [
        {
          ...representative,
          title: "Services",
          description: summary.description,
          qty: summary.qtyTotal,
          unitPrice: summary.unitPrice,
          lineTotal: summary.lineTotal,
          meta: {
            ...safeRecord(representative?.meta),
            groupUid,
            serviceRows: summary.rows,
            taxxable: summary.rows.some((row) => Boolean(row?.taxxable)),
            produceable: summary.rows.some((row) => Boolean(row?.produceable)),
            rateRoundingAdjustment: summary.rateRoundingAdjustment,
            totalAuthoritative: summary.totalAuthoritative,
          },
        } as unknown as T,
      ];
    }

    const mouldingRows = siblings.map((item, index) => {
      const mouldingStep = findLineStepByTitle(item, "Moulding");
      const hpt = item?.housePackageTool || null;
      const hptMeta = safeRecord(hpt?.meta);
      const priceTags = safeRecord(hptMeta.priceTags);
      const mouldingTag = safeRecord(priceTags.moulding);
      return {
        salesItemId: item?.id ?? null,
        hptId: hpt?.id ?? null,
        groupUid,
        primaryGroupItem: Boolean(item?.multiDyke) || index === 0,
        uid:
          String(mouldingStep?.prodUid || "").trim() ||
          String(item?.uid || "").trim() ||
          String(hpt?.molding?.value || "").trim() ||
          `legacy-moulding-${index + 1}`,
        title: String(
          mouldingStep?.value ||
            item?.description ||
            hpt?.molding?.title ||
            "Moulding",
        ).trim(),
        description: String(
          item?.description ||
            mouldingStep?.value ||
            hpt?.molding?.title ||
            "Moulding",
        ).trim(),
        qty: Number(item?.qty || 0),
        addon: Number(mouldingTag.addon || 0),
        customPrice:
          mouldingTag.overridePrice == null || mouldingTag.overridePrice === ""
            ? null
            : Number(mouldingTag.overridePrice || 0),
        salesPrice: Number(
          mouldingTag.salesPrice ?? mouldingTag.price ?? item?.unitPrice ?? 0,
        ),
        basePrice: Number(mouldingTag.basePrice ?? mouldingStep?.basePrice ?? 0),
        unitLabor: mouldingTag.unitLabor ?? null,
        laborQty: mouldingTag.laborQty ?? null,
        stepProductId: hpt?.stepProductId ?? mouldingStep?.componentId ?? null,
        mouldingProductId: hpt?.moldingId ?? null,
      };
    });
    const summary = summarizeMouldingRows(mouldingRows);
    const nextFormSteps = Array.isArray(representative?.formSteps)
      ? representative.formSteps.map((step: any) => {
          if (!isMouldingTitle(step?.step?.title)) return step;
          return {
            ...step,
            prodUid: summary.rows[0]?.uid || step?.prodUid || "",
            value: summary.rows
              .map((row) => String(row.title || "").trim())
              .filter(Boolean)
              .join(", "),
            price: summary.lineTotal,
            basePrice: summary.rows.reduce(
              (sum, row) => sum + Number(row.basePrice || 0),
              0,
            ),
            meta: {
              ...safeRecord(step?.meta),
              selectedProdUids: summary.rows.map((row) => row.uid),
              selectedComponents: summary.rows.map((row) => ({
                id: row.stepProductId ?? null,
                uid: row.uid,
                title: row.title,
                img: null,
                inventoryId: null,
                inventoryVariantId: null,
                salesPrice: row.salesPrice,
                basePrice: row.basePrice,
                pricing: null,
                supplierVariants: [],
                redirectUid: null,
                sectionOverride: null,
              })),
            },
          };
        })
      : representative?.formSteps || [];

    return [
      {
        ...representative,
        title: "Moulding",
        description: summary.description,
        qty: summary.qtyTotal,
        unitPrice: summary.unitPrice,
        lineTotal: summary.lineTotal,
        meta: {
          ...safeRecord(representative?.meta),
          groupUid,
          mouldingRows: summary.rows,
          rateRoundingAdjustment: summary.rateRoundingAdjustment,
          totalAuthoritative: summary.totalAuthoritative,
        },
        formSteps: nextFormSteps,
      } as unknown as T,
    ];
  });
}

function groupedRows(line: any, kind: GroupKind) {
  const rows = getLineMetaRows(line, kind === "moulding" ? "mouldingRows" : "serviceRows");
  if (rows.length) return rows;
  if (kind === "service") {
    return [
      {
        uid: line?.uid || `service-${generateRandomString(6)}`,
        service: line?.description || line?.title || "",
        qty: Number(line?.qty || 0),
        unitPrice: Number(line?.unitPrice || 0),
        lineTotal: Number(line?.lineTotal || 0),
        primaryGroupItem: true,
      },
    ];
  }
  return [
    {
      uid: line?.uid || `moulding-${generateRandomString(6)}`,
      title: line?.description || line?.title || "Moulding",
      description: line?.description || line?.title || "Moulding",
      qty: Number(line?.qty || 0),
      salesPrice: Number(line?.unitPrice || 0),
      lineTotal: Number(line?.lineTotal || 0),
      primaryGroupItem: true,
    },
  ];
}

export function expandGroupedLineForLegacySave<T extends Record<string, any>>(
  line: T,
): Array<{
  line: T;
  kind: GroupKind | null;
  row: Record<string, any> | null;
  groupUid: string | null;
  primaryGroupItem: boolean;
}> {
  const kind: GroupKind | null = isGroupedMouldingLine(line)
    ? "moulding"
    : isGroupedServiceLine(line)
      ? "service"
      : null;
  if (!kind) {
    return [
      {
        line,
        kind: null,
        row: null,
        groupUid: null,
        primaryGroupItem: false,
      },
    ];
  }
  const rows = groupedRows(line, kind);
  const meta = safeRecord(line?.meta);
  const groupUid =
    String(meta.groupUid || rows[0]?.groupUid || line?.uid || "").trim() ||
    generateRandomString(8);
  return rows.map((row, index) => ({
    line,
    kind,
    row,
    groupUid,
    primaryGroupItem: Boolean(row?.primaryGroupItem) || index === 0,
  }));
}
