import { describe, expect, it } from "bun:test";
import {
	type RedirectRule,
	resolveCanonicalPath,
	resolveRedirectPath,
	resolveRedirectPathWithRules,
} from "./redirect-engine";

describe("redirect engine", () => {
	it("redirects the versioned login route to the canonical login", () => {
		expect(
			resolveRedirectPath("/login/v2?return_to=/sales-book/orders"),
		).toEqual({
			pathname: "/login",
			search: "?return_to=/sales-book/orders",
			permanent: false,
		});
	});

	it("resolves exact redirects and preserves query strings", () => {
		expect(
			resolveRedirectPath("/sales-book/production-tasks?tab=assigned"),
		).toEqual({
			pathname: "/production/dashboard",
			search: "?tab=assigned",
			permanent: false,
		});
	});

	it("resolves dynamic pattern redirects", () => {
		const rules: RedirectRule[] = [
			{
				from: "/sales-book/orders/:salesNo",
				to: "/sales/orders/:salesNo",
				type: "pattern",
			},
		];

		expect(
			resolveRedirectPathWithRules(
				"/sales-book/orders/07621PC?view=compact",
				rules,
			),
		).toEqual({
			pathname: "/sales/orders/07621PC",
			search: "?view=compact",
			permanent: false,
		});
	});

	it("resolves prefix redirects after exact and pattern rules", () => {
		const rules: RedirectRule[] = [
			{
				from: "/sales-book",
				to: "/sales",
				type: "prefix",
			},
		];

		expect(
			resolveRedirectPathWithRules("/sales-book/orders/pending", rules),
		).toEqual({
			pathname: "/sales/orders/pending",
			search: "",
			permanent: false,
		});
	});

	it("normalizes canonical paths through the same redirect rules", () => {
		expect(resolveCanonicalPath("/sales-book/production-tasks?tab=mine")).toBe(
			"/production/dashboard?tab=mine",
		);
	});

	it("normalizes the versioned production dashboard to the base route", () => {
		expect(
			resolveRedirectPath("/production/dashboard/v2?show=unscheduled"),
		).toEqual({
			pathname: "/production/dashboard",
			search: "?show=unscheduled",
			permanent: false,
		});
	});

	it("returns null when no redirect is needed", () => {
		expect(resolveRedirectPath("/login")).toBeNull();
		expect(resolveRedirectPath("/production/dashboard")).toBeNull();
		expect(resolveRedirectPath("/sales-book/productions?tab=queue")).toBeNull();
	});
});
