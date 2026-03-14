import { describe, expect, it } from "bun:test";
import { __globalSearchTestUtils } from "./search";

describe("global search helpers", () => {
	it("reads rows from paginated response and plain arrays", () => {
		const fromData = __globalSearchTestUtils.asRows({
			data: [{ id: 1 }, { id: 2 }],
		});
		const fromArray = __globalSearchTestUtils.asRows([{ id: 3 }]);
		const fromInvalid = __globalSearchTestUtils.asRows({ hello: "world" });

		expect(fromData.length).toBe(2);
		expect(fromArray.length).toBe(1);
		expect(fromInvalid.length).toBe(0);
	});

	it("builds safe query strings", () => {
		expect(__globalSearchTestUtils.encodeQueryValue("A B")).toBe("A%20B");
		expect(__globalSearchTestUtils.encodeQueryValue(42)).toBe("42");
		expect(__globalSearchTestUtils.encodeQueryValue(null)).toBeUndefined();
	});
});

describe("global search source transforms", () => {
	const sources = __globalSearchTestUtils.sourceConfigs;

	it("maps sales result with orderNo link", () => {
		const result = sources.sales.transform({
			id: 10,
			orderId: "SO-1001",
			displayName: "Ada Doors",
			customerPhone: "123",
		});

		expect(result?.name).toBe("sales");
		expect(result?.href).toContain("/sales-book/orders?orderNo=");
		expect(result?.title).toContain("SO-1001");
	});

	it("maps employee result with editEmployeeId link", () => {
		const result = sources.employees.transform({
			id: 7,
			name: "Jane Doe",
			email: "jane@example.com",
			role: "Manager",
		});

		expect(result?.name).toBe("employees");
		expect(result?.href).toBe("/hrm/employees?editEmployeeId=7");
		expect(result?.subtitle).toContain("Manager");
	});

	it("maps builder result with openBuilderId link", () => {
		const result = sources.builders.transform({
			id: 55,
			name: "Prime Builder",
			_count: {
				projects: 4,
				homes: 20,
			},
		});

		expect(result?.name).toBe("builders");
		expect(result?.href).toBe("/community/builders?openBuilderId=55");
		expect(result?.subtitle).toContain("Projects: 4");
	});
});
