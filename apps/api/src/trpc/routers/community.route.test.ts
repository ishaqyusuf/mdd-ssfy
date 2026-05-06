import { describe, expect, it } from "bun:test";
import {
	getBuilderTasksForProject,
	getCommunityJobForm,
} from "../../db/queries/community-job-form";
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
		expect(calls[0]?.where.builder.projects.some.id).toBe(10);
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
});
