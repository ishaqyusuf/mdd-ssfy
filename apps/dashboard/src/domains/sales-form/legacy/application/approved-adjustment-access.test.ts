import { describe, expect, it } from "bun:test";
import { resolveApprovedAdjustmentLegacyAccess } from "./approved-adjustment-access";

describe("approved adjustment legacy access", () => {
	it("routes snapshot-owned orders to a read-only new-form handoff", () => {
		expect(
			resolveApprovedAdjustmentLegacyAccess({
				adjustmentSnapshotAuthority: true,
				order: { type: "order", slug: "09187PC" },
			}),
		).toEqual({
			readOnly: true,
			title: "Customer-approved change in effect",
			description:
				"This legacy view is read-only. Continue in the new sales form to make further changes.",
			newFormHref: "/sales-form/edit-order/09187PC",
		});
	});

	it("keeps ordinary legacy orders editable", () => {
		expect(
			resolveApprovedAdjustmentLegacyAccess({
				adjustmentSnapshotAuthority: false,
				order: { type: "quote", slug: "03464PC" },
			}),
		).toEqual({ readOnly: false });
	});

	it("keeps malformed adjusted payloads protected without emitting a broken link", () => {
		expect(
			resolveApprovedAdjustmentLegacyAccess({
				adjustmentSnapshotAuthority: true,
				order: null,
			}),
		).toEqual({
			readOnly: true,
			title: "Customer-approved change in effect",
			description:
				"This legacy view is read-only. Continue in the new sales form to make further changes.",
			newFormHref: null,
		});
	});
});
