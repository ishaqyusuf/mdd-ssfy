import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("moulding calculator pricing semantics", () => {
    it("derives price per linear foot from piece price and piece length", () => {
        const source = readFileSync(
            new URL("./moulding-calculator.tsx", import.meta.url),
            "utf8",
        );

        expect(source).toContain("data.unitPrice / data.unitLF");
        expect(source).not.toContain("data.longFoot / data.unitPrice");
    });

    it("does not require an optional calculate callback", () => {
        const source = readFileSync(
            new URL("./moulding-calculator.tsx", import.meta.url),
            "utf8",
        );

        expect(source).toContain("props.onCalculate?.(");
    });

    it("refreshes calculator defaults when the host row changes while closed", () => {
        const source = readFileSync(
            new URL("./moulding-calculator.tsx", import.meta.url),
            "utf8",
        );

        expect(source).toContain("if (opened) return;");
        expect(source).toContain("form.reset({");
    });
});
