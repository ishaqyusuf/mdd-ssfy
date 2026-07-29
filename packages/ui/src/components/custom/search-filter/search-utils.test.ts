import { describe, expect, it } from "bun:test";
import { searchIcons } from "./search-utils";

describe("search filter icons", () => {
	it("maps project-unit filters to registered icon keys", () => {
		expect(searchIcons.template).toBe("template");
		expect(searchIcons.installCost).toBe("installCosts");
		expect(searchIcons.installation).toBe("installation");
	});

	it("maps every Sales Orders filter to its domain icon", () => {
		expect(searchIcons.dateRange).toBe("calendar");
		expect(searchIcons["customer.name"]).toBe("user");
		expect(searchIcons.phone).toBe("phone");
		expect(searchIcons.po).toBe("post");
		expect(searchIcons["sales.rep"]).toBe("user");
		expect(searchIcons.salesNo).toBe("orders");
		expect(searchIcons.item).toBe("products");
		expect(searchIcons["dispatch.status"]).toBe("dispatch");
		expect(searchIcons.invoice).toBe("invoice");
		expect(searchIcons.paymentReview).toBe("payment");
		expect(searchIcons.production).toBe("production");
		expect(searchIcons["sales.priority"]).toBe("flag");
		expect(searchIcons.salesChannel).toBe("Share");
		expect(searchIcons.inbound).toBe("inbound");
	});
});
