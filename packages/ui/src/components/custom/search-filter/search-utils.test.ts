import { describe, expect, it } from "bun:test";
import { searchIcons } from "./search-utils";

describe("search filter icons", () => {
	it("maps project-unit filters to registered icon keys", () => {
		expect(searchIcons.template).toBe("template");
		expect(searchIcons.installCost).toBe("installCosts");
		expect(searchIcons.installation).toBe("installation");
	});
});
