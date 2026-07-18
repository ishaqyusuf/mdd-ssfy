import { describe, expect, it } from "bun:test";
import { getPageTabViewState, shouldRenderPageTabsShell } from "./render-utils";

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
});
