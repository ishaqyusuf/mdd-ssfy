#!/usr/bin/env bun

import { salesOverviewDto } from "../../apps/api/src/dto/sales-dto";
import { getSalesInventoryInboundOwnership } from "../../apps/api/src/db/queries/sales-inventory-inbound-ownership";
import { SalesOverviewInclude } from "../../apps/api/src/utils/sales";
import { PrismaClient } from "../../packages/db/src/index";
import { resolveSalesOverviewDocumentReadiness } from "../../packages/sales/src/pdf-system";

const orderNo = process.argv[2] || "09397LM";
const samples = Math.max(3, Number(process.argv[3] || 7));
const db = new PrismaClient({
  log: [{ emit: "event", level: "query" }],
});
let queryCount = 0;
db.$on("query", () => {
  queryCount += 1;
});

const {
  items: _items,
  salesProfile: _salesProfile,
  deliveries: _deliveries,
  ...generalV2Include
} = SalesOverviewInclude;

function percentile(values: number[], value: number) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * value) - 1),
  );
  return sorted[index] ?? 0;
}

async function load() {
  queryCount = 0;
  const startedAt = performance.now();
  const sale = await db.salesOrders.findFirst({
    where: { orderId: orderNo, type: "order", deletedAt: null },
    include: generalV2Include,
  });
  if (!sale) throw new Error(`Order ${orderNo} was not found.`);
  const [inventoryInboundOwnership, documentSnapshot] = await Promise.all([
    getSalesInventoryInboundOwnership(db as never, sale.id),
    db.salesDocumentSnapshot.findFirst({
      where: {
        salesOrderId: sale.id,
        documentType: { startsWith: "invoice_pdf" },
        isCurrent: true,
        deletedAt: null,
      },
      orderBy: [{ generatedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        generationStatus: true,
        storedDocumentId: true,
        sourceUpdatedAt: true,
        generatedAt: true,
        errorMessage: true,
      },
    }),
  ]);
  const result = {
    ...salesOverviewDto(sale as never, "order"),
    inventoryInboundOwnership,
    documentReadiness: resolveSalesOverviewDocumentReadiness({
      saleUpdatedAt: sale.updatedAt,
      snapshot: documentSnapshot,
    }),
  };
  const durationMs = performance.now() - startedAt;
  const serialized = JSON.stringify(result);
  return {
    durationMs,
    queryCount,
    payloadBytes: Buffer.byteLength(serialized),
    rootKeys: Object.keys(result).length,
  };
}

try {
  await load();
  const results = [];
  for (let index = 0; index < samples; index += 1) {
    results.push(await load());
  }
  const durations = results.map((result) => result.durationMs);
  const queries = results.map((result) => result.queryCount);
  const payloads = results.map((result) => result.payloadBytes);
} finally {
  await db.$disconnect();
}
