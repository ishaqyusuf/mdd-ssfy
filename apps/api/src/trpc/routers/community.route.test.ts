import { describe, expect, it } from "bun:test";
import {
	getBuilderTasksForProject,
	getCommunityJobForm,
} from "../../db/queries/community-job-form";
import {
	getProjectUnitInstallCostStatus,
	getProjectUnitTemplateStatus,
	whereProjectUnits,
} from "../../db/queries/project-units";
import {
	getUnitInvoicesCount,
	whereUnitInvoices,
} from "../../db/queries/unit-invoices";
import type { TRPCContext } from "../init";

type BuilderTaskWhere = {
	id?: number;
	installable?: boolean;
	deletedAt?: Date | null;
	builder?: {
		projects?: {
			some?: {
				id?: number;
			};
		};
	};
};

type BuilderTaskArgs = {
	where: BuilderTaskWhere;
};

function createContext(db: unknown): TRPCContext {
	return {
		db: db as TRPCContext["db"],
		userId: 101,
	};
}

describe("project unit filters", () => {
	it("searches unit, project, and builder text fields", () => {
		expect(whereProjectUnits({ q: "cedar" })).toEqual({
			OR: [
				{ search: { contains: "cedar" } },
				{ modelName: { contains: "cedar" } },
				{ lotBlock: { contains: "cedar" } },
				{ project: { title: { contains: "cedar" } } },
				{ project: { builder: { name: { contains: "cedar" } } } },
			],
		});
	});

	it("filters by project, builder, and installation states", () => {
		expect(
			whereProjectUnits({
				builderSlug: "builder-one",
				projectSlug: "project-alpha",
				installation: "has installation",
			}),
		).toEqual({
			AND: [
				{ project: { builder: { slug: "builder-one" } } },
				{ project: { slug: "project-alpha" } },
				{ jobs: { some: {} } },
			],
		});

		expect(whereProjectUnits({ installation: "No Submission" })).toEqual({
			jobs: { none: {} },
		});
	});

	it("detects configured template data", () => {
		expect(getProjectUnitTemplateStatus(null)).toBe("not configured");
		expect(
			getProjectUnitTemplateStatus({
				id: 1,
				meta: { design: { elevation: "A" } },
				templateValues: [],
			}),
		).toBe("configured");
		expect(
			getProjectUnitTemplateStatus({
				id: 2,
				meta: {},
				templateValues: [{ value: 0, inventoryId: 10 }],
			}),
		).toBe("configured");
		expect(
			getProjectUnitTemplateStatus({
				id: 3,
				meta: { design: {} },
				templateValues: [],
			}),
		).toBe("not configured");
	});

	it("detects install-cost configuration states", () => {
		const baseTemplate = {
			id: 1,
			project: {
				builder: {
					tasks: [
						{ id: 10, installable: true },
						{ id: 11, installable: true },
						{ id: 12, installable: false },
					],
				},
			},
		};

		expect(
			getProjectUnitInstallCostStatus({
				...baseTemplate,
				communityModelInstallTasks: [],
			}),
		).toBe("not configured");
		expect(
			getProjectUnitInstallCostStatus({
				...baseTemplate,
				communityModelInstallTasks: [
					{ builderTaskId: 10, qty: 2, installCostModel: { unitCost: 25 } },
				],
			}),
		).toBe("part configured");
		expect(
			getProjectUnitInstallCostStatus({
				...baseTemplate,
				communityModelInstallTasks: [
					{ builderTaskId: 10, qty: 2, installCostModel: { unitCost: 25 } },
					{ builderTaskId: 11, qty: 1, installCostModel: { unitCost: 40 } },
				],
			}),
		).toBe("configured");
		expect(
			getProjectUnitInstallCostStatus({
				id: 2,
				project: { builder: { tasks: [] } },
				communityModelInstallTasks: [],
			}),
		).toBe("not configured");
	});
});

describe("unit invoice filters", () => {
	it("searches the same visible unit fields as project units", () => {
		expect(whereUnitInvoices({ q: "/01" })).toEqual({
			OR: [
				{ search: { contains: "/01" } },
				{ modelName: { contains: "/01" } },
				{ lotBlock: { contains: "/01" } },
				{ project: { title: { contains: "/01" } } },
				{ project: { builder: { name: { contains: "/01" } } } },
			],
		});
	});

	it("keeps project scope when searching visible unit fields", () => {
		expect(
			whereUnitInvoices({
				q: "/01",
				projectSlug: "breezewood-villas",
			}),
		).toEqual({
			AND: [
				{
					OR: [
						{ search: { contains: "/01" } },
						{ modelName: { contains: "/01" } },
						{ lotBlock: { contains: "/01" } },
						{ project: { title: { contains: "/01" } } },
						{ project: { builder: { name: { contains: "/01" } } } },
					],
				},
				{ project: { slug: "breezewood-villas" } },
			],
		});
	});

	it("counts unit invoice tabs through the same where helper", async () => {
		const calls: Array<{ where: unknown }> = [];
		const ctx = createContext({
			homes: {
				count: async (args: { where: unknown }) => {
					calls.push(args);
					return 19;
				},
			},
		});

		await expect(
			getUnitInvoicesCount(ctx, {
				q: "/01",
				projectSlug: "breezewood-villas",
			}),
		).resolves.toBe(19);
		expect(calls[0]).toEqual({
			where: whereUnitInvoices({
				q: "/01",
				projectSlug: "breezewood-villas",
			}),
		});
	});
});

describe("community job submission task APIs", () => {
	it("returns only builder tasks checked for jobs in builder form", async () => {
		const calls: BuilderTaskArgs[] = [];
		const rows = [
			{
				id: 3,
				taskName: "Second Job Task",
				installable: true,
				deletedAt: null,
				taskIndex: 2,
				createdAt: new Date("2024-02-01T00:00:00.000Z"),
			},
			{
				id: 1,
				taskName: "First Job Task",
				installable: true,
				deletedAt: null,
				taskIndex: 1,
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
			},
			{
				id: 4,
				taskName: "Unchecked Task",
				installable: false,
				deletedAt: null,
				taskIndex: 0,
				createdAt: new Date("2024-01-01T00:00:00.000Z"),
			},
			{
				id: 5,
				taskName: "Unset Task",
				installable: null,
				deletedAt: null,
				taskIndex: 3,
				createdAt: new Date("2024-03-01T00:00:00.000Z"),
			},
			{
				id: 6,
				taskName: "Deleted Job Task",
				installable: true,
				deletedAt: new Date("2024-04-01T00:00:00.000Z"),
				taskIndex: 4,
				createdAt: new Date("2024-04-01T00:00:00.000Z"),
			},
		];

		const db = {
			builderTask: {
				findMany: async (args: BuilderTaskArgs) => {
					calls.push(args);
					return rows.filter((row) => {
						if (
							args.where.installable !== undefined &&
							row.installable !== args.where.installable
						) {
							return false;
						}
						if (
							Object.hasOwn(args.where, "deletedAt") &&
							row.deletedAt !== args.where.deletedAt
						) {
							return false;
						}
						return true;
					});
				},
			},
		};

		const result = await getBuilderTasksForProject(createContext(db), {
			projectId: 10,
			homeId: 20,
		});

		expect(calls[0]?.where.installable).toBe(true);
		expect(calls[0]?.where.deletedAt).toBeNull();
			expect(calls[0]?.where.builder?.projects?.some?.id).toBe(10);
		expect(result).toEqual([
			{ id: 1, taskName: "First Job Task" },
			{ id: 3, taskName: "Second Job Task" },
		]);
	});

	it("does not hydrate job task rows for a selected builder task unchecked for jobs", async () => {
		let builderTaskWhere: BuilderTaskWhere | null = null;
		const nonJobBuilderTask = {
			id: 88,
			installable: false,
			deletedAt: null,
			taskIndex: 1,
			createdAt: new Date("2024-01-01T00:00:00.000Z"),
			taskName: "Internal Builder Task",
			addonPercentage: 10,
			builderTaskInstallCosts: [
				{
					id: 500,
					orderIndex: 1,
					createdAt: new Date("2024-01-01T00:00:00.000Z"),
					modelInstallTasks: [
						{
							id: 700,
							communityModelId: 44,
							installCostModelId: 900,
							qty: 2,
							status: "active",
						},
					],
					defaultQty: 2,
					installCostModel: {
						id: 900,
						title: "Should Not Render",
						unit: "ea",
						unitCost: 50,
					},
				},
			],
		};
		const db = {
			homes: {
				findFirst: async () => ({
					lot: "1",
					block: "A",
					modelName: "Model A",
					lotBlock: "1/A",
					project: {
						meta: { addon: 25 },
						title: "Project Alpha",
						builder: { name: "Builder One" },
					},
				}),
			},
			builderTask: {
				findFirst: async (args: BuilderTaskArgs) => {
					builderTaskWhere = args.where;
					if (
						args.where.installable !== undefined &&
						nonJobBuilderTask.installable !== args.where.installable
					) {
						return null;
					}
					if (
						Object.hasOwn(args.where, "deletedAt") &&
						nonJobBuilderTask.deletedAt !== args.where.deletedAt
					) {
						return null;
					}
					return nonJobBuilderTask;
				},
			},
			jobs: {
				findFirst: async () => null,
			},
			users: {
				findFirst: async () => ({
					id: 7,
					name: "Installer",
				}),
			},
		};

		const result = await getCommunityJobForm(createContext(db), {
			unitId: 12,
			builderTaskId: 88,
			modelId: 44,
			userId: 7,
		});

		expect(builderTaskWhere).toMatchObject({
			id: 88,
			installable: true,
			deletedAt: null,
		});
		expect(result.builderTaskId).toBe(88);
		expect(result.job.tasks).toEqual([]);
		expect(result.job.isCustom).toBe(false);
	});

	it("hydrates job task rows in the selected builder task install-cost order", async () => {
		const db = {
			homes: {
				findFirst: async () => ({
					lot: "1",
					block: "A",
					modelName: "Model A",
					lotBlock: "1/A",
					project: {
						meta: { addon: 25 },
						title: "Project Alpha",
						builder: { name: "Builder One" },
					},
				}),
			},
			builderTask: {
				findFirst: async () => ({
					id: 88,
					installable: true,
					deletedAt: null,
					taskIndex: 1,
					createdAt: new Date("2024-01-01T00:00:00.000Z"),
					taskName: "Install",
					addonPercentage: 10,
					builderTaskInstallCosts: [
						{
							id: 500,
							orderIndex: 2,
							createdAt: new Date("2024-03-01T00:00:00.000Z"),
							modelInstallTasks: [
								{
									id: 700,
									communityModelId: 44,
									installCostModelId: 900,
									qty: 2,
									status: "active",
								},
							],
							defaultQty: 2,
							installCostModel: {
								id: 900,
								title: "Third configured item",
								unit: "ea",
								unitCost: 50,
							},
						},
						{
							id: 501,
							orderIndex: 0,
							createdAt: new Date("2024-01-01T00:00:00.000Z"),
							modelInstallTasks: [
								{
									id: 701,
									communityModelId: 44,
									installCostModelId: 901,
									qty: 4,
									status: "active",
								},
							],
							defaultQty: 4,
							installCostModel: {
								id: 901,
								title: "First configured item",
								unit: "ea",
								unitCost: 25,
							},
						},
						{
							id: 502,
							orderIndex: 1,
							createdAt: new Date("2024-02-01T00:00:00.000Z"),
							modelInstallTasks: [
								{
									id: 702,
									communityModelId: 44,
									installCostModelId: 902,
									qty: 3,
									status: "active",
								},
							],
							defaultQty: 3,
							installCostModel: {
								id: 902,
								title: "Second configured item",
								unit: "ea",
								unitCost: 35,
							},
						},
					],
				}),
			},
			jobs: {
				findFirst: async () => null,
			},
			users: {
				findFirst: async () => ({
					id: 7,
					name: "Installer",
				}),
			},
		};

		const result = await getCommunityJobForm(createContext(db), {
			unitId: 12,
			builderTaskId: 88,
			modelId: 44,
			userId: 7,
		});

		expect(result.job.tasks.map((task) => task.title)).toEqual([
			"First configured item",
			"Second configured item",
			"Third configured item",
		]);
		expect(result.job.tasks.map((task) => task.modelTaskId)).toEqual([
			701, 702, 700,
		]);
	});
});
