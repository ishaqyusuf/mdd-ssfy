import {
	getNewSalesFormStepRoutingSchema,
	type GetNewSalesFormStepRoutingSchema,
} from "@api/schemas/new-sales-form";
import type { TRPCContext } from "@api/trpc/init";
import { salesWorkflowCache } from "@gnd/cache/sales-workflow-cache";
import {
	getCachedSalesFormComponentUsageRanks,
	getVersionedSalesWorkflowCatalogSnapshot,
} from "./new-sales-form-catalog";
import { getStaticStepComponentCatalog } from "./sales-form";

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

export async function getNewSalesFormStepRouting(
	ctx: TRPCContext,
	input: GetNewSalesFormStepRoutingSchema,
	options: { interactive?: boolean } = {},
) {
	getNewSalesFormStepRoutingSchema.parse(input);
	const interactive = options.interactive === true;
	if (
		process.env.GND_SALES_CATALOG_CACHE !== "1" &&
		(process.env.NODE_ENV === "production" ||
			process.env.GND_SALES_CATALOG_CACHE === "0")
	) {
		return salesWorkflowCache.getOrSetStepRouting(() =>
			getFreshNewSalesFormStepRouting(ctx),
		);
	}
	if (!interactive) {
		const snapshot = await getVersionedSalesWorkflowCatalogSnapshot(
			ctx,
			{},
			"routing-full",
			(routingCtx) => getFreshNewSalesFormStepRouting(routingCtx),
		);
		return snapshot.data;
	}
	const snapshot = await getVersionedSalesWorkflowCatalogSnapshot(
		ctx,
		{},
		"routing",
		async (routingCtx) => {
			const routing = projectInteractiveNewSalesFormRouting(
				await getFreshNewSalesFormStepRouting(routingCtx, {
					includeCustomComponents: false,
				}),
			);
			const rootStepId = routing.rootStepUid
				? routing.stepsByUid[routing.rootStepUid]?.id
				: null;
			return {
				...routing,
				rootCatalogComponents: rootStepId
					? await getStaticStepComponentCatalog(routingCtx, {
							stepId: rootStepId,
							isCustom: false,
						})
					: [],
			};
		},
	);
	const rootStepId = snapshot.data.rootStepUid
		? snapshot.data.stepsByUid[snapshot.data.rootStepUid]?.id
		: null;
	let rootUsageRanks:
		| Awaited<ReturnType<typeof getCachedSalesFormComponentUsageRanks>>
		| undefined;
	if (rootStepId) {
		rootUsageRanks = await getCachedSalesFormComponentUsageRanks({
			stepId: rootStepId,
			isCustom: false,
		});
	}
	return {
		...snapshot.data,
		rootUsageRanks,
		rootCatalog: {
			revision: snapshot.revision,
			schemaVersion: snapshot.schemaVersion,
			components: snapshot.data.rootCatalogComponents,
		},
	};
}

export function projectInteractiveNewSalesFormRouting(
	routing: Awaited<ReturnType<typeof getFreshNewSalesFormStepRouting>>,
) {
	return {
		...routing,
		stepsByUid: Object.fromEntries(
			Object.entries(routing.stepsByUid).map(([uid, step]) => [
				uid,
				uid === routing.rootStepUid
					? step
					: {
						...step,
						components: step.components.map((component) => ({
							...component,
							img: null,
							meta: null,
						})),
					},
			]),
		),
	};
}

/** Bypass workflow caches for correctness-critical transactional replay. */
export async function getFreshNewSalesFormStepRouting(
	ctx: TRPCContext,
	options: { includeCustomComponents?: boolean } = {},
) {
	const [setting, steps] = await Promise.all([
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
				deletedAt: null,
			},
			orderBy: { id: "asc" },
			select: {
				id: true,
				meta: true,
			},
		}),
		ctx.db.dykeSteps.findMany({
			where: {
				deletedAt: null,
			},
			select: {
				id: true,
				uid: true,
				title: true,
				meta: true,
				stepProducts: {
					where: {
						deletedAt: null,
						...(options.includeCustomComponents === false
							? { OR: [{ custom: false }, { custom: null }] }
							: {}),
					},
					select: {
						id: true,
						uid: true,
						name: true,
						img: true,
						meta: true,
						redirectUid: true,
						product: {
							select: {
								title: true,
								img: true,
							},
						},
						door: {
							select: {
								title: true,
								img: true,
							},
						},
					},
				},
			},
			orderBy: { id: "asc" },
		}),
	]);

	const settingsMeta = safeRecord(setting?.meta);
	const nestedRouteData = safeRecord(settingsMeta.data);
	const rawRoute = safeRecord(
		Object.keys(safeRecord(settingsMeta.route)).length
			? settingsMeta.route
			: nestedRouteData.route,
	);
	const composedRouter: Record<
		string,
		{
			config?: unknown;
			routeSequence: Array<{ uid: string }>;
			route: Record<string, string>;
		}
	> = {};

	for (const [rootUid, routeDef] of Object.entries(rawRoute)) {
		const routeObj = safeRecord(routeDef);
		const routeSequence = Array.isArray(routeObj.routeSequence)
			? routeObj.routeSequence
					.map((entry) => safeRecord(entry))
					.map((entry) => ({ uid: String(entry.uid || "") }))
					.filter((entry) => !!entry.uid)
			: [];
		const route: Record<string, string> = {};
		let current = rootUid;
		for (const next of routeSequence) {
			route[current] = next.uid;
			current = next.uid;
		}
		composedRouter[rootUid] = {
			config: routeObj.config,
			routeSequence,
			route,
		};
	}

	const stepsByUid: Record<
		string,
		{
			id: number;
			uid: string;
			title: string | null;
			meta: Record<string, unknown>;
			components: Array<{
				id: number;
				uid: string;
				title: string | null;
				redirectUid: string | null;
				img: string | null;
				meta: unknown;
			}>;
		}
	> = {};
	const stepsById: Record<number, string> = {};

	for (const step of steps) {
		if (!step.uid) continue;
		stepsById[step.id] = step.uid;
		stepsByUid[step.uid] = {
			id: step.id,
			uid: step.uid,
			title: step.title,
			meta: safeRecord(step.meta),
			components: (step.stepProducts || [])
				.filter((component) => !!component.uid)
				.map((component) => ({
					id: component.id,
					uid: component.uid!,
					title:
						component.name ||
						component.product?.title ||
						component.door?.title ||
						null,
					redirectUid: component.redirectUid || null,
					meta: component.meta,
					img:
						component.img ||
						component.product?.img ||
						component.door?.img ||
						null,
				})),
		};
	}

	const configuredRootComponentUids = Object.keys(composedRouter);
	const rootStepFromRoute =
		Object.values(stepsByUid)
			.map((step) => ({
				step,
				score: (step.components || []).filter((component) =>
					configuredRootComponentUids.includes(component.uid),
				).length,
			}))
			.sort((a, b) => b.score - a.score)[0] || null;
	const rootStep =
		(rootStepFromRoute && rootStepFromRoute.score > 0
			? rootStepFromRoute.step
			: null) ||
		Object.values(stepsByUid).find((step) => step.id === 1) ||
		null;
	return {
		settingId: setting?.id || null,
		settingsMeta,
		composedRouter,
		stepsByUid,
		stepsById,
		rootStepUid: rootStep?.uid || null,
		rootComponents: rootStep?.components || [],
	};
}
