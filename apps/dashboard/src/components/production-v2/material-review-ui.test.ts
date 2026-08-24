import { describe, expect, it } from "bun:test";

const source = await Bun.file(new URL("./shared.tsx", import.meta.url)).text();

describe("production material review UI", () => {
    it("uses the audited configuration-exception action for missing material configuration", () => {
        expect(source.includes('"APPROVE_CONFIGURATION_EXCEPTION"')).toBe(true);
        expect(source.includes("Approve confirmed availability")).toBe(true);
        expect(source.includes("does not create")).toBe(true);
    });

    it("does not treat a null component id as inventory component zero", () => {
        expect(
            source.includes(
                'typeof row.componentId === "number" ? row.componentId : null',
            ),
        ).toBe(true);
        expect(source.includes("componentId <= 0")).toBe(true);
    });
});
