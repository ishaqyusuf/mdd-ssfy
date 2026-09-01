// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { classifyTable } from "./local-sync";

const schema = readFileSync(
	new URL("./schema/sales.prisma", import.meta.url),
	"utf8",
);
const qtyControlModel = schema.match(
	/model QtyControl \{[\s\S]*?\n\}/,
)?.[0];

describe("QtyControl local-sync contract", () => {
	test("exposes an update cursor for incremental production-control sync", () => {
		expect(qtyControlModel).toContain("updatedAt");
		expect(qtyControlModel).toContain("@updatedAt");

		expect(
			classifyTable({
				table: "QtyControl",
				columns: ["itemControlUid", "type", "updatedAt"],
				keyColumns: ["itemControlUid", "type"],
				refreshStatic: false,
			}),
		).toMatchObject({
			mode: "incremental",
			cursorColumns: ["updatedAt"],
		});
	});
});
