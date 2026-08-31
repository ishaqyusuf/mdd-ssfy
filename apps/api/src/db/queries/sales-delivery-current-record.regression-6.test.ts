import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { SalesOverviewGeneralV2Include } from "./sales-overview-general-v2";

const dispatchSource = readFileSync(
	new URL("./dispatch.ts", import.meta.url),
	"utf8",
);

describe("current sales delivery selection regression", () => {
	test("loads the newest active delivery in both General overview queries", () => {
		expect(SalesOverviewGeneralV2Include.deliveries).toMatchObject({
			orderBy: { id: "desc" },
			take: 1,
		});
		expect(dispatchSource).toMatch(
			/orderBy:\s*\{\s*id:\s*"desc",?\s*\}/,
		);
	});
});
