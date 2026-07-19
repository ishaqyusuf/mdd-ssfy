import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TRPCError } from "@trpc/server";
import { pageTabsRouter } from "./page-tabs.route";

const routerSource = readFileSync(
	resolve(import.meta.dir, "page-tabs.route.ts"),
	{
		encoding: "utf8",
	},
);

const countedRolloutPages = [
	"/sales-book/orders",
	"/sales-book/quotes",
	"/sales-book/customers",
	"/sales-book/dealers",
	"/hrm/employees",
	"/hrm/contractors/jobs",
	"/community/projects",
	"/community/project-units",
	"/community/unit-invoices",
	"/community/templates",
	"/community/customer-services",
	"/community/unit-productions",
];

type PageTabFixture = {
	id: number;
	page: string;
	title: string;
	query: string;
	userId: number;
	private: boolean | null;
	meta?: Record<string, unknown> | null;
	deletedAt: Date | null;
	tabIndices?: PageTabIndexFixture[];
};

type PageTabIndexFixture = {
	id: string;
	tabId: number;
	userId: number;
	tabIndex?: number;
	default?: boolean | null;
	deletedAt: Date | null;
};

type DbArgs = {
	where: Record<string, unknown>;
	data?: Record<string, unknown>;
};

function createCaller({
	userId = 2,
	roleName = "Sales",
	tabs = [],
	indices = [],
	dealerCount = 7,
}: {
	userId?: number;
	roleName?: string;
	tabs?: PageTabFixture[];
	indices?: PageTabIndexFixture[];
	dealerCount?: number;
} = {}) {
	const state = {
		tabs: [...tabs],
		indices: [...indices],
		dealerCountArgs: [] as DbArgs[],
	};
	const db = {
		users: {
			findUnique: async () => ({
				roles: [{ role: { name: roleName } }],
			}),
		},
		dealerAuth: {
			count: async (args: DbArgs) => {
				state.dealerCountArgs.push(args);
				return dealerCount;
			},
		},
		pageTabs: {
			findMany: async (args: DbArgs) =>
				state.tabs
					.filter((tab) => tab.page === args.where.page)
					.filter((tab) => tab.deletedAt === null)
					.filter(
						(tab) =>
							(tab.userId === userId && tab.private === true) ||
							tab.private === false,
					)
					.map((tab) => ({
						...tab,
						tabIndices: state.indices.filter(
							(index) =>
								index.tabId === tab.id &&
								index.userId === userId &&
								index.deletedAt === null,
						),
					})),
			count: async () =>
				state.tabs.filter(
					(tab) =>
						tab.deletedAt === null &&
						((tab.userId === userId && tab.private === true) ||
							tab.private === false),
				).length,
			create: async (args: DbArgs) => {
				const data = args.data ?? {};
				const indexData = (
					data.tabIndices as { create: Partial<PageTabIndexFixture> }
				).create;
				const tab = {
					id: state.tabs.length + 1,
					deletedAt: null,
					...data,
					private: Boolean(data.private),
					tabIndices: [
						{
							id: `index-${state.indices.length + 1}`,
							tabId: state.tabs.length + 1,
							deletedAt: null,
							...indexData,
						},
					],
				} as PageTabFixture & { tabIndices: PageTabIndexFixture[] };
				state.tabs.push({ ...tab, tabIndices: undefined });
				const tabIndex = tab.tabIndices[0];
				if (!tabIndex) throw new Error("missing tab index");
				state.indices.push(tabIndex);
				return tab;
			},
			findFirst: async (args: DbArgs) =>
				withIndices(
					state.tabs.find(
						(tab) => tab.id === args.where.id && tab.deletedAt === null,
					) ?? null,
				),
			findFirstOrThrow: async (args: DbArgs) => {
				const tab = state.tabs.find((item) => item.id === args.where.id);
				if (!tab) throw new Error("not found");
				return {
					...tab,
					tabIndices: state.indices.filter(
						(index) =>
							index.tabId === tab.id &&
							index.userId === userId &&
							index.deletedAt === null,
					),
				};
			},
			update: async (args: DbArgs) => {
				const tab = state.tabs.find((item) => item.id === args.where.id);
				if (!tab) throw new Error("not found");
				for (const [key, value] of Object.entries(args.data ?? {})) {
					if (value !== undefined) {
						Object.assign(tab, { [key]: value });
					}
				}
				return {
					...tab,
					tabIndices: state.indices.filter(
						(index) =>
							index.tabId === tab.id &&
							index.userId === userId &&
							index.deletedAt === null,
					),
				};
			},
		},
		pageTabIndex: {
			findMany: async () =>
				state.indices
					.filter((index) => index.userId === userId && index.default)
					.map((index) => ({
						...index,
						tab: state.tabs.find((tab) => tab.id === index.tabId),
					})),
			updateMany: async (args: DbArgs) => {
				for (const index of state.indices) {
					const matchesUser =
						args.where.userId === undefined ||
						index.userId === args.where.userId;
					const matchesTab =
						args.where.tabId === undefined || index.tabId === args.where.tabId;
					const matchesDefault =
						args.where.default === undefined ||
						index.default === args.where.default;

					if (matchesUser && matchesTab && matchesDefault) {
						Object.assign(index, args.data);
					}
				}
				return { count: 1 };
			},
			update: async (args: DbArgs) => {
				const index = state.indices.find((item) => item.id === args.where.id);
				if (!index) throw new Error("not found");
				Object.assign(index, args.data);
				return index;
			},
			create: async (args: DbArgs) => {
				const index = {
					id: `index-${state.indices.length + 1}`,
					deletedAt: null,
					...args.data,
				} as PageTabIndexFixture;
				state.indices.push(index);
				return index;
			},
		},
		$transaction: async (callback: (client: unknown) => unknown) =>
			callback(db),
	};

	return {
		caller: pageTabsRouter.createCaller({
			db,
			userId,
		} as unknown as Parameters<typeof pageTabsRouter.createCaller>[0]),
		state,
	};

	function withIndices(tab: PageTabFixture | null) {
		if (!tab) return null;
		return {
			...tab,
			tabIndices: state.indices.filter(
				(index) =>
					index.tabId === tab.id &&
					index.userId === userId &&
					index.deletedAt === null,
			),
		};
	}
}

describe("pageTabs router", () => {
	it("keeps count adapters registered for every rollout page", () => {
		const missing = countedRolloutPages.filter(
			(page) => !routerSource.includes(`case "${page}":`),
		);

		expect(missing).toEqual([]);
	});

	it("lists owned private tabs and public tabs only", async () => {
		const { caller } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Mine",
					query: "q=mine",
					userId: 2,
					private: true,
					deletedAt: null,
				},
				{
					id: 2,
					page: "/custom",
					title: "Other private",
					query: "q=other",
					userId: 3,
					private: true,
					deletedAt: null,
				},
				{
					id: 3,
					page: "/custom",
					title: "General",
					query: "q=all",
					userId: 3,
					private: false,
					deletedAt: null,
				},
			],
		});

		const result = await caller.list({ page: "/custom" });

		expect(result.map((tab) => tab.title)).toEqual(["Mine", "General"]);
		expect(result[1]).toMatchObject({
			visibility: "public",
			canManage: false,
		});
	});

	it("normalizes page inputs to path-only values", async () => {
		const { caller, state } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Mine",
					query: "q=mine",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
		});

		const listed = await caller.list({
			page: "https://gndprodesk.localhost:3011/custom?sort=createdAt.desc#tabs",
		});
		const created = await caller.create({
			page: "custom/?q=ignored#tabs",
			title: "Created",
			query: "status=new",
		});

		expect(listed.map((tab) => tab.title)).toEqual(["Mine"]);
		expect(created.page).toBe("/custom");
		expect(state.tabs.at(-1)?.page).toBe("/custom");
	});

	it("includes the selected tab name in default navigation hrefs", async () => {
		const { caller } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Needs review",
					query: "status=pending",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
			indices: [
				{
					id: "index-1",
					tabId: 1,
					userId: 2,
					tabIndex: 0,
					default: true,
					deletedAt: null,
				},
			],
		});

		expect(await caller.defaults()).toEqual({
			"/custom": "/custom?status=pending&tabName=Needs+review",
		});
	});

	it("rejects search values in newly saved or updated tab queries", async () => {
		const { caller } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Existing",
					query: "status=pending",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
		});

		await expect(
			caller.create({
				page: "/custom",
				title: "Search",
				query: "q=oak&status=pending",
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(
			caller.update({ id: 1, query: "search=oak&status=pending" }),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
	});

	it("rejects public tab creation for non Super Admin users", async () => {
		const { caller } = createCaller({ roleName: "Sales" });

		await expect(
			caller.create({
				page: "/custom",
				title: "General",
				query: "q=all",
				visibility: "public",
			}),
		).rejects.toBeInstanceOf(TRPCError);
	});

	it("allows public tabs to become a per-user default without management access", async () => {
		const { caller, state } = createCaller({
			userId: 2,
			roleName: "Sales",
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "General",
					query: "q=all",
					userId: 9,
					private: false,
					deletedAt: null,
				},
			],
		});

		const result = await caller.update({ id: 1, setDefault: true });

		expect(result.default).toBe(true);
		expect(result.canManage).toBe(false);
		expect(state.indices).toMatchObject([
			{
				tabId: 1,
				userId: 2,
				default: true,
			},
		]);
	});

	it("hides draft tabs from normal list and includes them for management", async () => {
		const { caller } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Active",
					query: "q=active",
					userId: 2,
					private: true,
					deletedAt: null,
				},
				{
					id: 2,
					page: "/custom",
					title: "Draft",
					query: "q=draft",
					userId: 2,
					private: true,
					meta: { active: false },
					deletedAt: null,
				},
			],
		});

		const activeTabs = await caller.list({ page: "/custom" });
		const allTabs = await caller.list({
			page: "/custom",
			includeInactive: true,
		});

		expect(activeTabs.map((tab) => tab.title)).toEqual(["Active"]);
		expect(allTabs.map((tab) => [tab.title, tab.active])).toEqual([
			["Active", true],
			["Draft", false],
		]);
	});

	it("lets a tab owner mark a tab as draft and clears defaults", async () => {
		const { caller, state } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Mine",
					query: "q=mine",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
			indices: [
				{
					id: "index-1",
					tabId: 1,
					userId: 2,
					tabIndex: 0,
					default: true,
					deletedAt: null,
				},
			],
		});

		const result = await caller.update({ id: 1, active: false });

		expect(result.active).toBe(false);
		expect(state.tabs[0]?.meta).toEqual({ active: false });
		expect(state.indices[0]?.default).toBe(false);
	});

	it("rejects public visibility updates for non Super Admin users", async () => {
		const { caller } = createCaller({
			roleName: "Sales",
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Mine",
					query: "q=mine",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
		});

		await expect(
			caller.update({ id: 1, visibility: "public" }),
		).rejects.toBeInstanceOf(TRPCError);
	});

	it("lets Super Admin update visibility", async () => {
		const { caller, state } = createCaller({
			roleName: "Super Admin",
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "Mine",
					query: "q=mine",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
		});

		const result = await caller.update({ id: 1, visibility: "public" });

		expect(result.visibility).toBe("public");
		expect(state.tabs[0]?.private).toBe(false);
	});

	it("persists drag order per user", async () => {
		const { caller, state } = createCaller({
			tabs: [
				{
					id: 1,
					page: "/custom",
					title: "First",
					query: "q=first",
					userId: 2,
					private: true,
					deletedAt: null,
				},
				{
					id: 2,
					page: "/custom",
					title: "Second",
					query: "q=second",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
			indices: [
				{
					id: "index-1",
					tabId: 1,
					userId: 2,
					tabIndex: 0,
					default: false,
					deletedAt: null,
				},
				{
					id: "index-2",
					tabId: 2,
					userId: 2,
					tabIndex: 1,
					default: false,
					deletedAt: null,
				},
			],
		});

		await caller.reorder({ page: "/custom", ids: [2, 1] });

		expect(state.indices).toMatchObject([
			{ tabId: 1, tabIndex: 1 },
			{ tabId: 2, tabIndex: 0 },
		]);
	});

	it("returns dealer tab counts from the dealer count adapter", async () => {
		const { caller, state } = createCaller({
			dealerCount: 11,
			tabs: [
				{
					id: 1,
					page: "/sales-book/dealers",
					title: "Active dealers",
					query: "search=prime&status=active",
					userId: 2,
					private: true,
					deletedAt: null,
				},
			],
		});

		const result = await caller.list({ page: "/sales-book/dealers" });

		expect(result[0]).toMatchObject({
			title: "Active dealers",
			count: 11,
		});
		expect(state.dealerCountArgs[0]?.where).toMatchObject({
			status: "active",
		});
	});
});
