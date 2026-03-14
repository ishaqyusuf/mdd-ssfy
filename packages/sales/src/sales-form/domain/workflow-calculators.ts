import { normalizeSalesFormTitle } from "./step-engine";

function firstFiniteNumber(...values: Array<number | null | undefined>) {
  for (const value of values) {
    const candidate = Number(value);
    if (Number.isFinite(candidate)) return candidate;
  }
  return null;
}

export function resolveSizeFromPricingKey(key: string, supplierUid?: string | null) {
  const raw = String(key || "").trim();
  if (!raw) return null;
  if (supplierUid) {
    const suffix = `& ${supplierUid}`;
    if (raw.endsWith(suffix)) {
      const size = raw.slice(0, -suffix.length).trim();
      return size.includes("x") ? size : null;
    }
  }
  if (raw.includes(" & ")) {
    const size = raw.split(" & ")[0]?.trim() || "";
    return size.includes("x") ? size : null;
  }
  return raw.includes("x") ? raw : null;
}

export function resolvePricingBucketUnitPrice({
  pricing,
  size,
  supplierUid,
  fallbackSalesPrice,
  fallbackBasePrice,
}: {
  pricing: Record<string, any> | null | undefined;
  size: string;
  supplierUid?: string | null;
  fallbackSalesPrice?: number | null;
  fallbackBasePrice?: number | null;
}) {
  const source = pricing || {};
  const supplierKey = supplierUid ? `${size} & ${supplierUid}` : null;
  const bucket =
    (supplierKey ? source[supplierKey] : null) ||
    source[size] ||
    null;
  const unit = firstFiniteNumber(
    bucket?.salesPrice,
    bucket?.price,
    bucket?.salesUnitCost,
    bucket?.basePrice,
    bucket?.baseUnitCost,
    fallbackSalesPrice,
    fallbackBasePrice,
  );
  return unit == null ? 0 : unit;
}

export function summarizeDoors(
  rows: any[],
  options?: {
    noHandle?: boolean;
    hasSwing?: boolean;
  },
) {
  const noHandle = !!options?.noHandle;
  const hasSwing = options?.hasSwing !== false;
  const normalized = (rows || []).map((row) => {
    const lhQty = Number(row?.lhQty || 0);
    const rhQty = Number(row?.rhQty || 0);
    const totalQty = noHandle
      ? Number(row?.totalQty || 0)
      : lhQty + rhQty > 0
        ? lhQty + rhQty
        : Number(row?.totalQty || 0);
    const unitPrice = Number(row?.unitPrice || 0);
    return {
      ...row,
      swing: hasSwing ? (row?.swing ?? "") : "",
      lhQty: noHandle ? 0 : lhQty,
      rhQty: noHandle ? 0 : rhQty,
      totalQty,
      unitPrice,
      lineTotal: Number((totalQty * unitPrice).toFixed(2)),
    };
  });
  const totalDoors = normalized.reduce((sum, row) => sum + Number(row?.totalQty || 0), 0);
  const totalPrice = normalized.reduce((sum, row) => sum + Number(row?.lineTotal || 0), 0);
  return {
    rows: normalized,
    totalDoors,
    totalPrice: Number(totalPrice.toFixed(2)),
  };
}

export function getRouteConfigForLine({
  routeData,
  line,
  step,
  component,
}: {
  routeData: any;
  line: any;
  step: any;
  component?: any;
}) {
  const rootComponentUid = line?.formSteps?.[0]?.prodUid;
  const routeConfigRaw = routeData?.composedRouter?.[rootComponentUid]?.config;
  const config = {
    ...(routeConfigRaw && typeof routeConfigRaw === "object" ? routeConfigRaw : {}),
  } as Record<string, any>;

  const applyOverride = (override: any) => {
    if (!override?.overrideMode) return;
    if (typeof override.noHandle === "boolean") config.noHandle = override.noHandle;
    if (typeof override.hasSwing === "boolean") config.hasSwing = override.hasSwing;
  };

  // Preserve deterministic precedence from persisted step flow:
  // base route config -> prior step overrides (in order) -> current component override -> current step override.
  const lineSteps = Array.isArray(line?.formSteps) ? line.formSteps : [];
  for (const formStep of lineSteps) {
    applyOverride(formStep?.meta?.sectionOverride);
  }
  applyOverride(component?.sectionOverride);
  applyOverride(step?.meta?.sectionOverride);

  return config;
}

export function deriveServiceRows({
  lineUid,
  existingRows,
  lineDescription,
  lineQty,
  lineUnitPrice,
  lineTaxxable,
  lineProduceable,
}: {
  lineUid: string;
  existingRows: any[];
  lineDescription?: string | null;
  lineQty?: number | null;
  lineUnitPrice?: number | null;
  lineTaxxable?: boolean | null;
  lineProduceable?: boolean | null;
}) {
  if (existingRows.length > 0) {
    return existingRows.map((row: any, index: number) => {
      const qty = Number(row?.qty ?? 0);
      const unitPrice = Number(row?.unitPrice ?? 0);
      return {
        uid: String(row?.uid || "").trim() || `service-${lineUid}-${index + 1}`,
        service: String(row?.service ?? row?.description ?? ""),
        taxxable: Boolean(row?.taxxable),
        produceable: Boolean(row?.produceable),
        qty,
        unitPrice,
        lineTotal: Number((qty * unitPrice).toFixed(2)),
      };
    });
  }
  const qty = Number(lineQty ?? 1);
  const unitPrice = Number(lineUnitPrice ?? 0);
  return [
    {
      uid: `service-${lineUid}-1`,
      service: String(lineDescription || "").trim(),
      taxxable: Boolean(lineTaxxable),
      produceable: Boolean(lineProduceable),
      qty,
      unitPrice,
      lineTotal: Number((qty * unitPrice).toFixed(2)),
    },
  ];
}

export function summarizeServiceRows(lineUid: string, nextRowsRaw: any[]) {
  const rows = nextRowsRaw.map((row: any, index: number) => {
    const qty = Number(row?.qty ?? 0);
    const unitPrice = Number(row?.unitPrice ?? 0);
    return {
      uid: String(row?.uid || "").trim() || `service-${lineUid}-${index + 1}`,
      service: String(row?.service ?? "").trim(),
      taxxable: Boolean(row?.taxxable),
      produceable: Boolean(row?.produceable),
      qty,
      unitPrice,
      lineTotal: Number((qty * unitPrice).toFixed(2)),
    };
  });
  const qtyTotal = rows.reduce((sum: number, row: any) => sum + Number(row.qty || 0), 0);
  const lineTotal = Number(
    rows
      .reduce((sum: number, row: any) => sum + Number(row.lineTotal || 0), 0)
      .toFixed(2),
  );
  const unitPrice = qtyTotal > 0 ? Number((lineTotal / qtyTotal).toFixed(2)) : 0;
  const taxxable = rows.some((row: any) => Boolean(row?.taxxable));
  const produceable = rows.some((row: any) => Boolean(row?.produceable));
  return {
    rows,
    qtyTotal,
    lineTotal,
    unitPrice,
    taxxable,
    produceable,
    description: rows
      .map((row: any) => String(row?.service || "").trim())
      .filter(Boolean)
      .join(" | "),
  };
}

export function summarizeShelfRows(nextRowsRaw: any[]) {
  const rows = (nextRowsRaw || []).map((row: any) => {
    const qty = Number(row?.qty ?? 0);
    const unitPrice = Number(row?.unitPrice ?? 0);
    return {
      ...row,
      qty,
      unitPrice,
      totalPrice: Number((qty * unitPrice).toFixed(2)),
    };
  });
  const qtyTotal = rows.reduce((sum: number, row: any) => sum + Number(row.qty || 0), 0);
  const lineTotal = Number(
    rows
      .reduce((sum: number, row: any) => sum + Number(row.totalPrice || 0), 0)
      .toFixed(2),
  );
  const unitPrice = qtyTotal > 0 ? Number((lineTotal / qtyTotal).toFixed(2)) : 0;
  return {
    rows,
    qtyTotal,
    lineTotal,
    unitPrice,
  };
}

export function deriveMouldingRows({
  selectedMouldings,
  existingRows,
  sharedComponentPrice,
}: {
  selectedMouldings: any[];
  existingRows: any[];
  sharedComponentPrice: number;
}) {
  const byUid = new Map(selectedMouldings.map((component: any) => [component.uid, component]));
  const existingByUid = new Map(existingRows.map((row: any) => [String(row.uid), row]));
  const initialRows = selectedMouldings.map((component: any) => {
    const existing = existingByUid.get(String(component.uid));
    const existingQty = existing?.qty == null ? null : Number(existing.qty);
    return {
      uid: component.uid,
      title: component.title,
      description: String(existing?.description || "").trim() || component.title || "Moulding",
      qty:
        existingQty == null || !Number.isFinite(existingQty) || existingQty <= 0
          ? 1
          : existingQty,
      addon: Number(existing?.addon ?? 0),
      customPrice:
        existing?.customPrice == null || existing?.customPrice === ""
          ? null
          : Number(existing.customPrice || 0),
      salesPrice: Number(existing?.salesPrice ?? component?.salesPrice ?? 0),
      basePrice: Number(existing?.basePrice ?? component?.basePrice ?? 0),
    };
  });

  return initialRows.map((row: any) => {
    const component = byUid.get(row.uid);
    const componentPrice = Number(row.salesPrice ?? component?.salesPrice ?? 0);
    const qty = Number(row.qty || 0);
    const addon = Number(row.addon || 0);
    const customPrice =
      row.customPrice == null || row.customPrice === "" ? null : Number(row.customPrice || 0);
    const estimateUnit = Number(sharedComponentPrice + componentPrice);
    const unit = customPrice == null ? estimateUnit + addon : Number(customPrice) + addon;
    const lineTotal = Number((qty * unit).toFixed(2));
    return {
      ...row,
      title: row.title || component?.title || "Moulding",
      description: row.description || component?.title || row.title || "Moulding",
      qty,
      addon,
      customPrice,
      salesPrice: componentPrice,
      basePrice: Number(row.basePrice ?? component?.basePrice ?? 0),
      estimateUnit,
      unit,
      lineTotal,
    };
  });
}

export function summarizeMouldingPersistRows(nextRowsRaw: any[], sharedComponentPrice: number) {
  const storedRows = nextRowsRaw.map((row: any) => ({
    uid: row.uid,
    title: row.title,
    description: row.description,
    qty: Number(row.qty || 0),
    addon: Number(row.addon || 0),
    customPrice:
      row.customPrice == null || row.customPrice === "" ? null : Number(row.customPrice || 0),
    salesPrice: Number(row.salesPrice || 0),
    basePrice: Number(row.basePrice || 0),
  }));
  const calculated = storedRows.map((row: any) => {
    const estimateUnit = Number(sharedComponentPrice + Number(row.salesPrice || 0));
    const unit =
      row.customPrice == null
        ? estimateUnit + Number(row.addon || 0)
        : Number(row.customPrice || 0) + Number(row.addon || 0);
    return {
      ...row,
      lineTotal: Number((Number(row.qty || 0) * unit).toFixed(2)),
    };
  });
  const qtyTotal = calculated.reduce((sum, row: any) => sum + Number(row.qty || 0), 0);
  const total = Number(
    calculated
      .reduce((sum, row: any) => sum + Number(row.lineTotal || 0), 0)
      .toFixed(2),
  );
  return {
    storedRows,
    calculated,
    qtyTotal,
    total,
    unitPrice: qtyTotal > 0 ? Number((total / qtyTotal).toFixed(2)) : 0,
  };
}

export function sharedMouldingComponentPrice(formSteps: any[]) {
  return (formSteps || [])
    .filter((step: any) => {
      const title = normalizeSalesFormTitle(step?.step?.title);
      return title !== "line item" && title !== "moulding";
    })
    .reduce((sum, step: any) => sum + Number(step?.price || 0), 0);
}
