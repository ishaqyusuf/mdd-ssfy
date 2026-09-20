import { afterAll, describe, expect, it } from "bun:test";
import { db } from "@gnd/db";
import { addDays } from "date-fns";
import type { TRPCContext } from "../../trpc/init";
import {
	getFreshNewSalesFormStepRouting,
	projectInteractiveNewSalesFormRouting,
} from "./new-sales-form";
import {
	getStepComponentUsageRanks,
	getStaticStepComponentCatalog,
	getStepComponents,
} from "./sales-form";

const enabled = process.env.SALES_CATALOG_PARITY_TEST === "1";
if (enabled) {
	const target = new URL(process.env.DATABASE_URL ?? "http://invalid");
	if (
		target.protocol !== "mysql:" ||
		target.hostname !== "127.0.0.1" ||
		target.port !== "3307" ||
		target.pathname !== "/gnd-prisma2"
	) {
		throw new Error("Catalog parity test requires the verified local database");
	}
}

afterAll(async () => db.$disconnect());

describe.skipIf(!enabled)("static sales catalog projection", () => {
	it("preserves recent sales ranking totals across Door and Jamb Size", async () => {
		const ctx = { db } as TRPCContext;
		for (const title of ["Door", "Jamb Size"]) {
			const step = await db.dykeSteps.findFirst({
				where: { title, deletedAt: null },
				select: { id: true },
			});
			expect(step).not.toBeNull();
			const ranks = await getStepComponentUsageRanks(ctx, {
				stepId: step!.id,
				stepTitle: title,
				isCustom: false,
			});
			const cutoff = addDays(new Date(), -30).toISOString();
			const oldCounts = await db.dykeStepProducts.findMany({
				where: { id: { in: ranks.map(({ id }) => id) } },
				select: {
					id: true,
					_count: {
						select: {
							housePackageTools: {
								where: { deletedAt: null, createdAt: { gte: cutoff } },
							},
							salesDoors: { where: { deletedAt: null, createdAt: { gte: cutoff } } },
							stepForms: { where: { deletedAt: null, createdAt: { gte: cutoff } } },
						},
					},
				},
			});
			expect(ranks.length).toBeGreaterThan(0);
			expect(new Map(ranks.map(({ id, statistics }) => [id, statistics]))).toEqual(
				new Map(oldCounts.map(({ id, _count }) => [
					id,
					_count.housePackageTools + _count.salesDoors + _count.stepForms,
				])),
			);
		}
	});

	it("preserves picker fields and dependency prices across catalog families", async () => {
		const ctx = { db } as TRPCContext;
		let checked = 0;
		for (const title of ["Item Type", "Door", "Moulding", "Service", "Shelf Items"]) {
			const step = await db.dykeSteps.findFirst({
				where: { title, deletedAt: null },
				orderBy: { id: "asc" },
				select: { id: true },
			});
			if (!step) continue;
			const input = { stepId: step.id, stepTitle: title };
			const [legacy, projected] = await Promise.all([
				getStepComponents(ctx, { ...input, fresh: true }),
				getStaticStepComponentCatalog(ctx, input),
			]);
			const normalize = (rows: typeof legacy) =>
				rows
					.map(({ statistics: _statistics, ...row }) => row)
					.sort((a, b) => a.id - b.id);
			expect(normalize(projected)).toEqual(normalize(legacy));
			checked++;
		}
		expect(checked).toBeGreaterThanOrEqual(3);
	});

	it("keeps custom, default and archived row semantics when projecting", async () => {
		const [custom, defaultComponent, archived] = await Promise.all([
			db.dykeStepProducts.findFirst({
				where: { custom: true, deletedAt: null },
				select: { id: true },
			}),
			db.dykeStepProducts.findFirst({
				where: { isDefault: true, deletedAt: null },
				select: { id: true },
			}),
			db.dykeStepProducts.findFirst({
				where: { deletedAt: { not: null } },
				select: { id: true },
			}),
		]);
		expect(custom).not.toBeNull();
		expect(defaultComponent).not.toBeNull();
		expect(archived).not.toBeNull();
		const ids = [custom!.id, defaultComponent!.id, archived!.id];
		const ctx = { db } as TRPCContext;
		const [legacy, projected] = await Promise.all([
			getStepComponents(ctx, { ids, fresh: true }),
			getStaticStepComponentCatalog(ctx, { ids }),
		]);
		const normalize = (rows: typeof legacy) => rows
			.map(({ statistics: _statistics, ...row }) => row)
			.sort((a, b) => a.id - b.id);
		expect(normalize(projected)).toEqual(normalize(legacy));
		expect(projected.find((row) => row.id === custom!.id)?._metaData.custom).toBe(true);
		expect(projected.find((row) => row.id === defaultComponent!.id)?.default).toBe(true);
		expect(projected.some((row) => row.id === archived!.id)).toBe(false);
	});

	it("excludes custom rows while retaining false and null ordinary rows", async () => {
		const step = await db.dykeSteps.findFirst({
			where: {
				deletedAt: null,
				AND: [
					{ stepProducts: { some: { custom: true, deletedAt: null } } },
					{
						stepProducts: {
							some: {
								deletedAt: null,
								OR: [{ custom: false }, { custom: null }],
							},
						},
					},
				],
			},
			select: { id: true },
		});
		expect(step).not.toBeNull();
		const expected = await db.dykeStepProducts.findMany({
			where: {
				dykeStepId: step!.id,
				deletedAt: null,
				OR: [{ custom: false }, { custom: null }],
			},
			select: { id: true },
		});
		const ctx = { db } as TRPCContext;
		const input = { stepId: step!.id, isCustom: false };
		const [legacy, projected] = await Promise.all([
			getStepComponents(ctx, { ...input, fresh: true }),
			getStaticStepComponentCatalog(ctx, input),
		]);
		const expectedIds = expected.map((row) => row.id).sort((a, b) => a - b);
		expect(legacy.map((row) => row.id).sort((a, b) => a - b)).toEqual(expectedIds);
		expect(projected.map((row) => row.id).sort((a, b) => a - b)).toEqual(expectedIds);
	});

	it("omits custom rows from UI routing without changing fresh replay", async () => {
		const ctx = { db } as TRPCContext;
		const [full, ordinary, custom] = await Promise.all([
			getFreshNewSalesFormStepRouting(ctx),
			getFreshNewSalesFormStepRouting(ctx, {
				includeCustomComponents: false,
			}),
			db.dykeStepProducts.findMany({
				where: { custom: true, deletedAt: null },
				select: { id: true },
			}),
		]);
		const customIds = new Set(custom.map((row) => row.id));
		const allComponents = (route: typeof full) =>
			Object.values(route.stepsByUid).flatMap((step) => step.components);
		expect(allComponents(full).some((component) => customIds.has(component.id))).toBe(true);
		expect(allComponents(ordinary).some((component) => customIds.has(component.id))).toBe(false);
		const rootUids = new Set(ordinary.rootComponents.map((component) => component.uid));
		expect(
			Object.keys(ordinary.composedRouter).every((uid) => rootUids.has(uid)),
		).toBe(true);
	});

	it("keeps full non-root metadata available for storefront and dealer routing", async () => {
		const full = await getFreshNewSalesFormStepRouting({ db } as TRPCContext);
		const interactive = projectInteractiveNewSalesFormRouting(
			await getFreshNewSalesFormStepRouting({ db } as TRPCContext, {
				includeCustomComponents: false,
			}),
		);
		const fullNonRoot = Object.entries(full.stepsByUid)
			.filter(([uid]) => uid !== full.rootStepUid)
			.flatMap(([, step]) => step.components);
		const interactiveNonRoot = Object.entries(interactive.stepsByUid)
			.filter(([uid]) => uid !== interactive.rootStepUid)
			.flatMap(([, step]) => step.components);
		expect(fullNonRoot.some((component) => component.meta || component.img)).toBe(true);
		expect(interactiveNonRoot.every((component) => component.meta === null && component.img === null)).toBe(true);
		expect(fullNonRoot.length).toBeGreaterThan(interactiveNonRoot.length);
	});

	it("filters legacy metadata archives but can hydrate a saved archived selection", async () => {
		const [custom, ordinary] = await Promise.all([
			db.dykeStepProducts.findFirst({
				where: { custom: true, deletedAt: null, uid: { not: null } },
				select: { id: true, uid: true, dykeStepId: true, meta: true },
			}),
			db.dykeStepProducts.findFirst({
				where: { OR: [{ custom: false }, { custom: null }], deletedAt: null, uid: { not: null } },
				select: { id: true, uid: true, dykeStepId: true, meta: true },
			}),
		]);
		expect(custom).not.toBeNull();
		expect(ordinary).not.toBeNull();
		await expect(
			db.$transaction(async (tx) => {
				for (const row of [custom!, ordinary!]) {
					await tx.dykeStepProducts.update({
						where: { id: row.id },
						data: {
							meta: {
								...((row.meta || {}) as Record<string, unknown>),
								deletedAt: new Date().toISOString(),
							},
						},
					});
				}
				const ctx = { db: tx } as TRPCContext;
				for (const [row, isCustom] of [[custom!, true], [ordinary!, false]] as const) {
					const query = { stepId: row.dykeStepId, isCustom };
					const active = await getStaticStepComponentCatalog(ctx, query, {
						selectedUid: row.uid!,
						limit: 1,
					});
					const selected = await getStaticStepComponentCatalog(ctx, query, {
						selectedUid: row.uid!,
						includeArchived: true,
						limit: 1,
					});
					expect(active).toHaveLength(0);
					expect(selected[0]?.isDeleted).toBe(true);
				}
				throw new Error("rollback metadata archive fixture");
			}),
		).rejects.toThrow("rollback metadata archive fixture");
	});
});
