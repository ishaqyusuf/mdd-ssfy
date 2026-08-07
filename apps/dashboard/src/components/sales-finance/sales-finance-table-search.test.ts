import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const headerSource = readFileSync(
	new URL("./header.tsx", import.meta.url),
	"utf8",
);
const workspaceSource = readFileSync(
	new URL("./workspace-client.tsx", import.meta.url),
	"utf8",
);

describe("Sales Finance Table Search in All tab", () => {
	test("exports SalesFinanceTableSearch component with SearchFilterTRPC and finance filter definitions", () => {
		expect(headerSource).toContain("export function SalesFinanceTableSearch()");
		expect(headerSource).toContain("filterSchema: salesFinanceSearchFilterParams");
		expect(headerSource).toContain("filterList={financeFilterDefinitions}");
	});

	test("renders SalesFinanceTableSearch copy above SalesFinanceDataTable in All tab", () => {
		expect(workspaceSource).toContain(
			'import {\n\tSalesFinanceHeader,\n\tSalesFinanceTableSearch,\n} from "@/components/sales-finance/header";',
		);
		expect(workspaceSource).toContain(
			'{params.tab === "all" ? <SalesFinanceTableSearch /> : null}',
		);
	});
});
