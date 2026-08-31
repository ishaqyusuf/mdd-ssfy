import { describe, expect, it } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icon } from "../../icons";
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
		expect(searchIcons.specialOrderScope).toBe("PenTool");
		expect(searchIcons.specialOrder).toBe("PenTool");
	});

	it("maps every Production workspace filter without the Search fallback", () => {
		expect(searchIcons.assignedToId).toBe("user");
		expect(searchIcons.queue).toBe("tasks");
		expect(searchIcons.due).toBe("calendar");
		expect(searchIcons.material).toBe("products");
		expect(searchIcons.sort).toBe("Sort");
	});

	it("maps Sales Finance filters without the generic search fallback", () => {
		expect(searchIcons.paymentMethods).toBe("payment");
		expect(searchIcons.statuses).toBe("Status");
		expect(searchIcons.applicationStatuses).toBe("accounting");
		expect(searchIcons.exceptionCodes).toBe("warning");
		expect(searchIcons.dueDateRange).toBe("calendar");
		expect(searchIcons.agingBuckets).toBe("calendar");
	});

	it("maps every Contractor Accounting filter to its domain icon", () => {
		expect(searchIcons.dateRange).toBe("calendar");
		expect(searchIcons.contractorIds).toBe("user");
		expect(searchIcons.entryTypes).toBe("accounting");
		expect(searchIcons.sourceTypes).toBe("documents");
		expect(searchIcons.amountBand).toBe("Currency");
		expect(searchIcons.exceptionsOnly).toBe("warning");

		const searchMarkup = renderToStaticMarkup(
			createElement(Icon, { name: "Search" }),
		);

		for (const key of [
			"dateRange",
			"contractorIds",
			"entryTypes",
			"sourceTypes",
			"amountBand",
			"exceptionsOnly",
		] as const) {
			const markup = renderToStaticMarkup(
				createElement(Icon, { name: searchIcons[key] }),
			);

			expect(markup).toContain("<svg");
			expect(markup).not.toBe(searchMarkup);
		}
	});
});
