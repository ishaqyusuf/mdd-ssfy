import { describe, expect, it } from "bun:test";
import {
	getPageTabSelection,
	getPageTabViewState,
	isResolvedPageTabActive,
	shouldRenderPageTabsShell,
	splitPageTabs,
} from "./render-utils";

describe("page tab render utils", () => {
	it("hides the shell when there are no tabs and no saveable action", () => {
		expect(
			shouldRenderPageTabsShell({
				tabCount: 0,
				hasAction: false,
			}),
		).toBe(false);
	});

	it("shows the shell when saved tabs exist", () => {
		expect(
			shouldRenderPageTabsShell({
				tabCount: 1,
				hasAction: false,
			}),
		).toBe(true);
	});

	it("shows the shell when the current query can be saved as a tab", () => {
		expect(
			shouldRenderPageTabsShell({
				tabCount: 0,
				hasAction: true,
				hasActionNode: true,
			}),
		).toBe(true);
	});

	it("hides the shell when an action is marked available but renders nothing", () => {
		expect(
			shouldRenderPageTabsShell({
				tabCount: 0,
				hasAction: true,
				hasActionNode: false,
			}),
		).toBe(false);
	});

	it("hides the shell when an action node exists without a saveable query", () => {
		expect(
			shouldRenderPageTabsShell({
				tabCount: 0,
				hasAction: false,
				hasActionNode: true,
			}),
		).toBe(false);
	});

	it("hides the save action until saved tabs are ready", () => {
		expect(
			getPageTabViewState({
				currentQuery: "status=pending",
				isReady: false,
				tabs: [],
			}),
		).toEqual({
			hasExactMatch: false,
			hasUnsavedView: false,
			matchingTabIndex: -1,
		});
	});

	it("activates saved-query tabs only through a valid named selection", () => {
		expect(
			isResolvedPageTabActive({
				hasSavedQuery: true,
				index: 2,
				selectedIndex: -1,
				fallbackActive: true,
			}),
		).toBe(false);
		expect(
			isResolvedPageTabActive({
				hasSavedQuery: true,
				index: 2,
				selectedIndex: 2,
				fallbackActive: false,
			}),
		).toBe(true);
		expect(
			isResolvedPageTabActive({
				hasSavedQuery: false,
				index: 2,
				selectedIndex: -1,
				fallbackActive: true,
			}),
		).toBe(true);
	});

	it("finds the first exact saved view and suppresses duplicate saves", () => {
		expect(
			getPageTabViewState({
				currentQuery: "roles=sales&roles=admin&sort=createdAt.desc",
				isReady: true,
				tabs: [
					{
						query: "sort=createdAt.desc&roles=admin&roles=sales",
					},
					{
						query: "roles=sales&roles=admin&sort=createdAt.desc",
					},
				],
			}),
		).toEqual({
			hasExactMatch: true,
			hasUnsavedView: false,
			matchingTabIndex: 0,
		});
	});

	it("treats an extended subset and an empty view as distinct states", () => {
		expect(
			getPageTabViewState({
				currentQuery: "status=pending&salesRepId=7",
				isReady: true,
				tabs: [{ query: "status=pending" }],
			}),
		).toEqual({
			hasExactMatch: false,
			hasUnsavedView: true,
			matchingTabIndex: -1,
		});
		expect(
			getPageTabViewState({
				currentQuery: "",
				isReady: true,
				tabs: [{ query: "status=pending" }],
			}),
		).toEqual({
			hasExactMatch: false,
			hasUnsavedView: false,
			matchingTabIndex: -1,
		});
	});

	it("keeps only the first three resolved tabs inline", () => {
		const tabs = ["All", "Pending", "Approved", "Paid", "Closed"];

		expect(splitPageTabs(tabs)).toEqual({
			visibleTabs: ["All", "Pending", "Approved"],
			overflowTabs: ["Paid", "Closed"],
		});
		expect(splitPageTabs(tabs.slice(0, 3))).toEqual({
			visibleTabs: ["All", "Pending", "Approved"],
			overflowTabs: [],
		});
	});

	it("promotes a selected overflow tab into the final inline position", () => {
		const tabs = ["All", "Pending", "Approved", "Paid", "Closed"];

		expect(splitPageTabs(tabs, 3, 4)).toEqual({
			visibleTabs: ["All", "Pending", "Closed"],
			overflowTabs: ["Approved", "Paid"],
		});
	});

	it("supports five inline tabs at the 2xl capacity", () => {
		const tabs = ["All", "Pending", "Approved", "Paid", "Closed", "Draft"];

		expect(splitPageTabs(tabs, 5)).toEqual({
			visibleTabs: ["All", "Pending", "Approved", "Paid", "Closed"],
			overflowTabs: ["Draft"],
		});
		expect(splitPageTabs(tabs, 5, 5)).toEqual({
			visibleTabs: ["All", "Pending", "Approved", "Paid", "Draft"],
			overflowTabs: ["Closed"],
		});
	});

	it("selects a named tab while unrelated query values coexist", () => {
		expect(
			getPageTabSelection({
				tabName: "Needs review",
				currentQuery:
					"paymentReview=needs_review&priority=high&q=oak&tabName=Needs+review",
				tabs: [
					{ title: "Needs review", query: "paymentReview=needs_review" },
					{ title: "Paid", query: "paymentStatus=paid" },
				],
			}),
		).toEqual({
			matchingTabIndex: 0,
			lockedKeys: ["paymentReview"],
		});
	});

	it("rejects a stale tabName after its baseline changes", () => {
		expect(
			getPageTabSelection({
				tabName: "Needs review",
				currentQuery: "paymentReview=reviewed&tabName=Needs+review",
				tabs: [{ title: "Needs review", query: "paymentReview=needs_review" }],
			}),
		).toEqual({ matchingTabIndex: -1, lockedKeys: [] });
	});

	it("selects the most specific matching baseline for duplicate titles", () => {
		expect(
			getPageTabSelection({
				tabName: "Review",
				currentQuery: "paymentReview=needs_review&priority=high&tabName=Review",
				tabs: [
					{ title: "Review", query: "paymentReview=needs_review" },
					{
						title: "Review",
						query: "paymentReview=needs_review&priority=high",
					},
				],
			}),
		).toEqual({
			matchingTabIndex: 1,
			lockedKeys: ["paymentReview", "priority"],
		});
	});

	it("rejects equally specific conflicting baselines with duplicate titles", () => {
		expect(
			getPageTabSelection({
				tabName: "Review",
				currentQuery: "paymentReview=needs_review&priority=high&tabName=Review",
				tabs: [
					{ title: "Review", query: "paymentReview=needs_review" },
					{ title: "Review", query: "priority=high" },
				],
			}),
		).toEqual({ matchingTabIndex: -1, lockedKeys: [] });
	});
});
