import { describe, expect, test } from "bun:test";
import { prisma } from "@/db";
import { calculateSalesFormSummary } from "@gnd/sales/sales-form";

import { normalizeSalesBookFormExtraCosts } from "./sales-book-extra-costs";

type SalesParityCase = {
    type: "order" | "quote";
    salesNo: string;
};

function roundCurrency(value: unknown) {
    const num = Number(value || 0);
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

function safeRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value != "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
}

function parseSalesParityCases(value?: string): SalesParityCase[] {
    return String(value || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
            const [maybeType, maybeSalesNo] = entry.includes(":")
                ? entry.split(":", 2)
                : ["order", entry];
            const type = maybeType?.trim().toLowerCase();
            if (type != "order" && type != "quote") {
                throw new Error(
                    `Invalid sales form parity case "${entry}". Use "order:08007PC" or "quote:08007PC".`,
                );
            }
            const salesNo = maybeSalesNo?.trim();
            if (!salesNo) {
                throw new Error(
                    `Invalid sales form parity case "${entry}". Missing order/quote number.`,
                );
            }
            return { type, salesNo };
        });
}

const cases = parseSalesParityCases(
    process.env.SALES_FORM_PARITY_CASES ||
        process.env.SALES_FORM_PARITY_ORDER_NOS,
);

describe("sales form parity against legacy persisted totals", () => {
    if (!cases.length) {
        test.skip(
            "set SALES_FORM_PARITY_CASES=order:08007PC,quote:QUOTE_NO to run live DB parity checks",
            () => {},
        );
        return;
    }

    for (const salesCase of cases) {
        test(`${salesCase.type}:${salesCase.salesNo}`, async () => {
            const order = await prisma.salesOrders.findFirst({
                where: {
                    type: salesCase.type,
                    OR: [
                        { slug: salesCase.salesNo },
                        { orderId: salesCase.salesNo },
                    ],
                    deletedAt: null,
                },
                select: {
                    id: true,
                    slug: true,
                    orderId: true,
                    type: true,
                    subTotal: true,
                    tax: true,
                    grandTotal: true,
                    taxPercentage: true,
                    meta: true,
                    extraCosts: {
                        select: {
                            id: true,
                            label: true,
                            type: true,
                            amount: true,
                            taxxable: true,
                        },
                    },
                    items: {
                        where: {
                            deletedAt: null,
                        },
                        select: {
                            id: true,
                            qty: true,
                            rate: true,
                            total: true,
                            dykeDescription: true,
                            description: true,
                        },
                    },
                },
            });

            expect(order).toBeTruthy();
            if (!order) return;

            const meta = safeRecord(order.meta);
            const extraCosts = normalizeSalesBookFormExtraCosts({
                id: order.id,
                extraCosts: order.extraCosts,
                meta,
            });
            const lineItems = order.items.map((item, index) => ({
                uid: `db-${item.id || index}`,
                title:
                    item.dykeDescription ||
                    item.description ||
                    `Line ${index + 1}`,
                qty: Number(item.qty || 0),
                unitPrice: Number(item.rate || 0),
                lineTotal: Number(item.total || 0),
            }));

            const summary = calculateSalesFormSummary({
                strategy: "legacy",
                taxRate: Number(order.taxPercentage || 0),
                paymentMethod:
                    typeof meta.payment_option == "string"
                        ? meta.payment_option
                        : null,
                cccPercentage: Number(meta.ccc_percentage || 3.5),
                lineItems,
                extraCosts,
            });

            expect(roundCurrency(summary.subTotal)).toBe(
                roundCurrency(order.subTotal),
            );
            expect(roundCurrency(summary.taxTotal)).toBe(roundCurrency(order.tax));
            expect(roundCurrency(summary.grandTotal)).toBe(
                roundCurrency(order.grandTotal),
            );
        });
    }
});
