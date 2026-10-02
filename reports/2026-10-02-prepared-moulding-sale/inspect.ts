import { evaluateSalesDocumentReadiness } from "../../packages/sales/src/document-readiness/evaluator";

const target = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1"].includes(target.hostname)) throw new Error("Local database required");
const { db } = await import("../../packages/db/src/index.ts");
try {
  const sale = await db.salesOrders.findFirstOrThrow({
    where: { id: 33385, orderId: "09955PC" },
    include: {
      taxes: { where: { deletedAt: null } },
      extraCosts: true,
      items: {
        where: { deletedAt: null },
        include: {
          formSteps: { where: { deletedAt: null }, include: { step: true } },
          housePackageTool: { include: { doors: { where: { deletedAt: null } } } },
        },
      },
    },
  });
  const evaluation = evaluateSalesDocumentReadiness(sale);
  const evidence = {
    readOnly: true,
    orderId: sale.orderId,
    id: sale.id,
    subTotal: sale.subTotal,
    tax: sale.tax,
    grandTotal: sale.grandTotal,
    amountDue: sale.amountDue,
    evaluation,
    items: sale.items.map(item => ({
      id: item.id,
      qty: item.qty,
      total: item.total,
      meta: item.meta,
      hpt: item.housePackageTool,
    })),
  };
  await Bun.write(new URL("./database-evidence.json", import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  if (evaluation.status !== "ready") process.exitCode = 1;
} finally {
  await db.$disconnect();
}
