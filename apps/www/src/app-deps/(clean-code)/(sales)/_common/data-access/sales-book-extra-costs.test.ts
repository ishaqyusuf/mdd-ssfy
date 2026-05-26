import { describe, expect, test } from "bun:test";

import { normalizeSalesBookFormExtraCosts } from "./sales-book-extra-costs";

describe("normalizeSalesBookFormExtraCosts", () => {
    test("does not duplicate legacy deliveryCost when a matching Delivery extra cost already exists", () => {
        const meta = {
            deliveryCost: 150,
        };

        const costs = normalizeSalesBookFormExtraCosts({
            id: 80,
            meta,
            extraCosts: [
                {
                    id: 10,
                    label: "Delivery",
                    type: "Delivery",
                    amount: 150,
                    orderId: 80,
                },
                {
                    id: 11,
                    label: "Labor",
                    type: "Labor",
                    amount: 0,
                    orderId: 80,
                },
            ],
        });

        expect(costs.filter((cost) => cost.type == "Delivery")).toHaveLength(1);
        expect(costs.filter((cost) => cost.type == "Delivery")[0]?.amount).toBe(
            150,
        );
        expect(meta.deliveryCost).toBeNull();
    });

    test("keeps legacy deliveryCost when it has not been migrated into extra costs", () => {
        const meta = {
            deliveryCost: 150,
        };

        const costs = normalizeSalesBookFormExtraCosts({
            id: 80,
            meta,
            extraCosts: [
                {
                    id: 11,
                    label: "Labor",
                    type: "Labor",
                    amount: 0,
                    orderId: 80,
                },
            ],
        });

        expect(costs.filter((cost) => cost.type == "Delivery")).toHaveLength(1);
        expect(costs.find((cost) => cost.type == "Delivery")?.amount).toBe(150);
        expect(meta.deliveryCost).toBeNull();
    });
});
