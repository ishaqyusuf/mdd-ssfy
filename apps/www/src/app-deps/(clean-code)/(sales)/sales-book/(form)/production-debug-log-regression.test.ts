import { describe, expect, it } from "bun:test";

const productionFiles = [
	"./_components/modals/door-size-select-modal/open-modal.tsx",
	"./_utils/helpers/zus/step-component-class.ts",
	"../../_common/utils/item-control-utils.ts",
	"../../_common/data-access/sales-progress.dta.ts",
	"../../_common/data-access/dto/sales-shipping-dto.ts",
] as const;

describe("legacy sales workflow production paths", () => {
	it("contain no raw console diagnostics", async () => {
		for (const file of productionFiles) {
			const source = await Bun.file(new URL(file, import.meta.url)).text();
			expect(source).not.toMatch(/console\.(log|debug|info)\s*\(/);
		}
	});
});
