import { PrismaClient } from "@prisma/client";
import {
	getConfiguredRequestRoutes,
	getConfiguredRequestStepUids,
} from "../packages/sales/src/sales-form/request-generation/configured-routes";

const target = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
	throw new Error("This inspection requires the local database.");
}
const db = new PrismaClient();
try {
	const settings = await db.settings.findMany({
		where: { type: "sales-settings", deletedAt: null },
		select: { id: true, meta: true },
	});
	const samples = [];
	for (const setting of settings) {
		const routes = getConfiguredRequestRoutes(setting.meta);
		const stepUids = getConfiguredRequestStepUids(routes);
		const rootComponents = await db.dykeStepProducts.findMany({
			where: {
				uid: { in: routes.map((route) => route.itemTypeUid) },
				deletedAt: null,
			},
			select: {
				uid: true,
				name: true,
				dykeStepId: true,
				product: { select: { title: true } },
				door: { select: { title: true } },
				step: { select: { id: true, uid: true, title: true } },
			},
			orderBy: { id: "asc" },
		});
		const configuredSteps = await db.dykeSteps.findMany({
			where: { uid: { in: stepUids }, deletedAt: null },
			select: { id: true, uid: true, title: true },
			orderBy: { id: "asc" },
		});
		const stepsById = new Map<
			number,
			{ id: number; uid: string | null; title: string | null }
		>();
		for (const step of [
			...rootComponents.map((component) => component.step),
			...configuredSteps,
		]) {
			if (!stepsById.has(step.id)) stepsById.set(step.id, step);
		}
		const steps = [...stepsById.values()].sort((a, b) => a.id - b.id);
		const stepIds = new Set(steps.map((step) => step.id));
		for (const component of rootComponents) {
			if (!stepIds.has(component.step.id)) {
				throw new Error(
					`Root component ${component.uid || ""} references an unexported step ID: ${component.step.id}`,
				);
			}
		}
		const components = await db.dykeStepProducts.findMany({
			where: {
				dykeStepId: { in: configuredSteps.map((step) => step.id) },
				deletedAt: null,
			},
			select: {
				uid: true,
				name: true,
				dykeStepId: true,
				meta: true,
				redirectUid: true,
				product: { select: { title: true } },
				door: { select: { title: true } },
			},
			orderBy: { id: "asc" },
		});
		samples.push({
			settingId: setting.id,
			routes,
			rootComponents: rootComponents.map((component) => ({
				uid: component.uid,
				title:
					component.name || component.door?.title || component.product?.title,
				stepId: component.step.id,
			})),
			steps,
			componentCount: components.length,
			duplicateStepUids: [...new Set(steps.map((step) => step.uid))].filter(
				(uid) => steps.filter((step) => step.uid === uid).length > 1,
			),
			missingStepUids: stepUids.filter(
				(uid) => !configuredSteps.some((step) => step.uid === uid),
			),
			// Inspect metadata keys before choosing a lossless price-free projection.
			componentMetadataKeys: [
				...new Set(
					components.flatMap((component) => {
						const meta = component.meta;
						return meta && typeof meta === "object" ? Object.keys(meta) : [];
					}),
				),
			],
			sampleComponents: components.slice(0, 8).map((component) => ({
				uid: component.uid,
				title:
					component.name || component.product?.title || component.door?.title,
				stepId: component.dykeStepId,
				redirectUid: component.redirectUid,
			})),
			sampleVisibility: components
				.flatMap((component) => {
					const meta = component.meta;
					if (
						!meta ||
						typeof meta !== "object" ||
						Array.isArray(meta) ||
						!meta.variations
					)
						return [];
					return [{ componentUid: component.uid, variations: meta.variations }];
				})
				.slice(0, 3),
		});
	}
	console.log(JSON.stringify(samples, null, 2));
} finally {
	await db.$disconnect();
}
