import { expect, test } from "bun:test";

const routeSource = await Bun.file(
	new URL("./new-sales-form.route.ts", import.meta.url),
).text();

function mutationBlock(name: "saveDraft" | "saveFinal") {
	const start = routeSource.indexOf(`\t${name}: protectedProcedure`);
	const nextName = name === "saveDraft" ? "saveFinal" : "deleteLineItem";
	const next = routeSource.indexOf(
		`\n\t${nextName}: protectedProcedure`,
		start,
	);
	expect(start).toBeGreaterThan(-1);
	return routeSource.slice(start, next === -1 ? undefined : next);
}

test("New Sales Form persistence requires editOrders before draft or final save", () => {
	for (const name of ["saveDraft", "saveFinal"] as const) {
		const block = mutationBlock(name);
		expect(block).toContain("await requireAnyOperationalPermission(");
		expect(block).toContain('["editOrders"]');
		const authorize = block.indexOf("await requireAnyOperationalPermission(");
		const persist = block.indexOf(
			name === "saveDraft"
				? "return saveDraftNewSalesForm"
				: "return saveFinalNewSalesForm",
		);
		expect(persist).toBeGreaterThan(authorize);
	}
});
