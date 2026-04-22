import type { TRPCContext } from "@api/trpc/init";
import { expireCurrentSalesDocumentSnapshots } from "@api/utils/sales-document-access";
import { queueSalesDocumentSnapshotWarmups } from "@api/utils/sales-document-warm";
import {
	bootstrapNewSalesFormSchema,
	deleteNewSalesFormLineItemSchema,
	getNewSalesFormSchema,
	getNewSalesFormStepRoutingSchema,
	getNewSalesFormShelfCategoriesSchema,
	getNewSalesFormShelfProductsSchema,
	recalculateNewSalesFormSchema,
	saveDraftNewSalesFormSchema,
	saveFinalNewSalesFormSchema,
	searchNewSalesCustomersSchema,
	resolveNewSalesCustomerSchema,
	type BootstrapNewSalesFormSchema,
	type DeleteNewSalesFormLineItemSchema,
	type GetNewSalesFormSchema,
	type GetNewSalesFormStepRoutingSchema,
	type GetNewSalesFormShelfCategoriesSchema,
	type GetNewSalesFormShelfProductsSchema,
	type NewSalesFormLineItem,
	type NewSalesFormExtraCost,
	type NewSalesFormMeta,
	type NewSalesFormSummary,
	type RecalculateNewSalesFormSchema,
	type SaveDraftNewSalesFormSchema,
	type SaveFinalNewSalesFormSchema,
	type SearchNewSalesCustomersSchema,
	type ResolveNewSalesCustomerSchema,
} from "@api/schemas/new-sales-form";
import { getSalesCustomer } from "@api/db/queries/customer";
import { salesAddressLines } from "@api/utils/sales";
import { TRPCError } from "@trpc/server";
import { projectLegacyOrderPayments } from "@gnd/sales";
import { generateRandomString } from "@gnd/utils";
import { calculateSalesFormSummary } from "@gnd/sales/sales-form";
import { generateSalesSlug } from "@gnd/sales/utils";
import { syncSalesInventoryLineItems } from "@sales/sync-sales-inventory-line-items";

const DEFAULT_DELIVERY_OPTION = "pickup";
const DEFAULT_PAYMENT_TERM = "None";

type NewSalesFormPersistedMeta = {
	version: string;
	updatedAt: string;
	autosave: boolean;
	lineItems: NewSalesFormLineItem[];
	extraCosts: NewSalesFormExtraCost[];
	summary: NewSalesFormSummary;
	form: NewSalesFormMeta;
};

type NewSalesFormContainer = {
	newSalesForm?: NewSalesFormPersistedMeta;
	[key: string]: unknown;
};

type NewSalesFormSettings = {
	cccPercentage: number;
	taxCode: string | null;
	customerProfileId: number | null;
};

function safeMeta(meta: unknown): NewSalesFormContainer {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return {};
	}
	return meta as NewSalesFormContainer;
}

function safeDate(value?: string | null) {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function safeRecord(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return value as Record<string, unknown>;
}

function roundCurrency(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function supportsInventorySync(
	db: unknown,
): db is Parameters<typeof syncSalesInventoryLineItems>[0] {
	const candidate = db as {
		salesOrders?: { findFirstOrThrow?: unknown };
		lineItem?: {
			findUnique?: unknown;
			create?: unknown;
			update?: unknown;
			updateMany?: unknown;
		};
	} | null;
	return Boolean(
		candidate &&
			typeof candidate.salesOrders?.findFirstOrThrow === "function" &&
			typeof candidate.lineItem?.findUnique === "function" &&
			typeof candidate.lineItem?.create === "function" &&
			typeof candidate.lineItem?.update === "function",
	);
}

function deriveNewSalesFormSettings(
	settingMeta?: unknown,
): NewSalesFormSettings {
	const settingsMeta = safeRecord(settingMeta);
	const nestedSettingsMeta = safeRecord(settingsMeta.data);
	return {
		cccPercentage:
			Number(settingsMeta.ccc ?? nestedSettingsMeta.ccc ?? 3.5) || 3.5,
		taxCode:
			(settingsMeta.taxCode as string | null | undefined) ??
			(nestedSettingsMeta.taxCode as string | null | undefined) ??
			null,
		customerProfileId:
			Number(
				settingsMeta.customerProfileId ??
					nestedSettingsMeta.customerProfileId ??
					0,
			) || null,
	};
}

function recalculateSummary(
	input: RecalculateNewSalesFormSchema & { cccPercentage?: number | null },
) {
	const summary = calculateSalesFormSummary({
		strategy: "legacy",
		taxRate: input.taxRate,
		paymentMethod: input.paymentMethod,
		cccPercentage: input.cccPercentage,
		lineItems: input.lineItems,
		extraCosts: input.extraCosts,
	});
	return {
		subTotal: summary.subTotal,
		adjustedSubTotal: summary.adjustedSubTotal,
		taxRate: summary.taxRate,
		taxTotal: summary.taxTotal,
		grandTotal: summary.grandTotal,
		discount: summary.discount,
		discountPct: summary.discountPct,
		percentDiscountValue: summary.percentDiscountValue,
		labor: summary.labor,
		delivery: summary.delivery,
		otherCosts: summary.otherCosts,
		taxableSubTotal: summary.taxableSubTotal,
		ccc: summary.ccc,
	};
}

function normalizeLineItems(lines: NewSalesFormLineItem[]) {
	return lines.map((line, index) => {
		const qty = Number(line.qty || 0);
		const unitPrice = Number(line.unitPrice || 0);
		const lineTotal = roundCurrency(
			Number.isFinite(line.lineTotal) ? line.lineTotal : qty * unitPrice,
		);
		return {
			...line,
			qty,
			unitPrice,
			lineTotal,
			uid: line.uid || `line-${index + 1}-${generateRandomString(6)}`,
			formSteps: line.formSteps || [],
			shelfItems: line.shelfItems || [],
			housePackageTool: line.housePackageTool || null,
		};
	});
}

async function generateSalesIdentity(
	ctx: TRPCContext,
	type: "order" | "quote",
): Promise<{ orderId: string; slug: string }> {
	const salesRep =
		ctx.userId != null
			? await ctx.db.users.findFirst({
					where: { id: ctx.userId },
					select: { name: true },
				})
			: null;
	const orderId = await generateSalesSlug(
		type as any,
		ctx.db.salesOrders,
		salesRep?.name || "",
	);
	return {
		orderId,
		slug: `${type}-${orderId.toLowerCase()}`,
	};
}

function toBootstrapPayload(
	order: {
		id: number;
		slug: string;
		orderId: string;
		type: string | null;
		status: string | null;
		customerId: number | null;
		customerProfileId: number | null;
		billingAddressId: number | null;
		shippingAddressId: number | null;
		paymentTerm: string | null;
		goodUntil: Date | null;
		prodDueDate: Date | null;
		deliveryOption: string | null;
		extraCosts: Array<{
			id: number;
			label: string;
			type: string;
			amount: number;
			taxxable: boolean | null;
		}>;
		taxPercentage: number | null;
		subTotal: number | null;
		tax: number | null;
		grandTotal: number | null;
		updatedAt: Date | null;
		items: Array<{
			id: number;
			description: string | null;
			qty: number | null;
			rate: number | null;
			total: number | null;
			meta: unknown;
			deletedAt: Date | null;
			formSteps: Array<{
				id: number;
				stepId: number;
				componentId: number | null;
				prodUid: string | null;
				value: string | null;
				qty: number | null;
				price: number | null;
				basePrice: number | null;
				meta: unknown;
				step: {
					id: number;
					uid: string | null;
					title: string | null;
				};
			}>;
			shelfItems: Array<{
				id: number;
				categoryId: number;
				productId: number | null;
				description: string | null;
				qty: number | null;
				unitPrice: number | null;
				totalPrice: number | null;
				meta: unknown;
			}>;
			housePackageTool: {
				id: number;
				deletedAt: Date | null;
				height: string | null;
				doorType: string | null;
				doorId: number | null;
				dykeDoorId: number | null;
				jambSizeId: number | null;
				casingId: number | null;
				moldingId: number | null;
				stepProductId: number | null;
				totalPrice: number | null;
				totalDoors: number | null;
				meta: unknown;
				molding: {
					id: number;
					deletedAt: Date | null;
					title: string | null;
					value: string;
					price: number | null;
				} | null;
				doors: Array<{
					id: number;
					dimension: string;
					swing: string | null;
					doorType: string | null;
					doorPrice: number | null;
					jambSizePrice: number | null;
					casingPrice: number | null;
					unitPrice: number | null;
					lhQty: number | null;
					rhQty: number | null;
					totalQty: number;
					lineTotal: number | null;
					stepProductId: number | null;
					meta: unknown;
				}>;
			} | null;
		}>;
		customer: {
			id: number;
			name: string | null;
			businessName: string | null;
			phoneNo: string | null;
			email: string | null;
		} | null;
		meta: unknown;
	},
	settings: NewSalesFormSettings,
) {
	const container = safeMeta(order.meta);
	const persisted = container.newSalesForm;
	const persistedLines = persisted?.lineItems || [];
	const persistedExtraCosts = persisted?.extraCosts || [];
	const dbLines = order.items
		.filter((item) => !item.deletedAt)
		.map((item, index) => {
			const itemMeta = safeRecord(item.meta);
			const lineMeta = safeRecord(itemMeta.meta);
			const housePackageTool =
				item.housePackageTool && !item.housePackageTool.deletedAt
					? {
							id: item.housePackageTool.id,
							height: item.housePackageTool.height,
							doorType: item.housePackageTool.doorType,
							doorId: item.housePackageTool.doorId,
							dykeDoorId: item.housePackageTool.dykeDoorId,
							jambSizeId: item.housePackageTool.jambSizeId,
							casingId: item.housePackageTool.casingId,
							moldingId: item.housePackageTool.moldingId,
							stepProductId: item.housePackageTool.stepProductId,
							totalPrice: Number(item.housePackageTool.totalPrice || 0),
							totalDoors: Number(item.housePackageTool.totalDoors || 0),
							meta: safeRecord(item.housePackageTool.meta),
							molding:
								item.housePackageTool.molding &&
								!item.housePackageTool.molding.deletedAt
									? {
											id: item.housePackageTool.molding.id,
											title: item.housePackageTool.molding.title,
											value: item.housePackageTool.molding.value,
											price: Number(item.housePackageTool.molding.price || 0),
										}
									: null,
							doors: (item.housePackageTool.doors || []).map((door) => ({
								id: door.id,
								dimension: door.dimension,
								swing: door.swing,
								doorType: door.doorType,
								doorPrice: Number(door.doorPrice || 0),
								jambSizePrice: Number(door.jambSizePrice || 0),
								casingPrice: Number(door.casingPrice || 0),
								unitPrice: Number(door.unitPrice || 0),
								lhQty: Number(door.lhQty || 0),
								rhQty: Number(door.rhQty || 0),
								totalQty: Number(door.totalQty || 0),
								lineTotal: Number(door.lineTotal || 0),
								stepProductId: door.stepProductId,
								meta: safeRecord(door.meta),
							})),
						}
					: null;
			return {
				id: item.id,
				uid:
					(typeof itemMeta.uid === "string" && itemMeta.uid) ||
					`line-${index + 1}-${generateRandomString(6)}`,
				title: item.description || `Line ${index + 1}`,
				description: item.description,
				qty: Number(item.qty || 0),
				unitPrice: Number(item.rate || 0),
				lineTotal: Number(item.total || 0),
				meta: lineMeta,
				formSteps: item.formSteps.map((step) => ({
					id: step.id,
					stepId: step.stepId,
					componentId: step.componentId,
					prodUid: step.prodUid,
					value: step.value,
					qty: Number(step.qty || 0),
					price: Number(step.price || 0),
					basePrice: Number(step.basePrice || 0),
					meta: safeRecord(step.meta),
					step: {
						id: step.step.id,
						uid: step.step.uid,
						title: step.step.title,
					},
				})),
				shelfItems: item.shelfItems.map((shelf) => ({
					id: shelf.id,
					categoryId: shelf.categoryId,
					productId: shelf.productId,
					description: shelf.description,
					qty: Number(shelf.qty || 0),
					unitPrice: Number(shelf.unitPrice || 0),
					totalPrice: Number(shelf.totalPrice || 0),
					meta: safeRecord(shelf.meta),
				})),
				housePackageTool,
			};
		});

	const lineItems = (persistedLines.length ? persistedLines : dbLines).map(
		(line, index) => {
			const dbMatch =
				dbLines.find((dbLine) => dbLine.id && dbLine.id === line.id) ||
				dbLines.find((dbLine) => dbLine.uid === line.uid) ||
				dbLines[index];
			const mergedHousePackageTool =
				line.housePackageTool || dbMatch?.housePackageTool
					? {
							...(dbMatch?.housePackageTool || {}),
							...(line.housePackageTool || {}),
							doors:
								line.housePackageTool?.doors &&
								line.housePackageTool.doors.length
									? line.housePackageTool.doors
									: dbMatch?.housePackageTool?.doors || [],
							molding:
								line.housePackageTool?.molding ||
								dbMatch?.housePackageTool?.molding ||
								null,
						}
					: null;
			return {
				...line,
				formSteps:
					line.formSteps && line.formSteps.length
						? line.formSteps
						: dbMatch?.formSteps || [],
				shelfItems:
					line.shelfItems && line.shelfItems.length
						? line.shelfItems
						: dbMatch?.shelfItems || [],
				housePackageTool: mergedHousePackageTool,
			};
		},
	);
	const taxRate = Number(
		order.taxPercentage || persisted?.summary?.taxRate || 0,
	);
	const summary = recalculateSummary({
		taxRate,
		paymentMethod:
			(persisted?.form?.paymentMethod as string | null | undefined) || null,
		cccPercentage: settings.cccPercentage,
		extraCosts: persistedExtraCosts.length
			? persistedExtraCosts.map((cost) => ({
					type: cost.type,
					amount: Number(cost.amount || 0),
					taxxable: cost.taxxable ?? false,
				}))
			: order.extraCosts.map((cost) => ({
					type: cost.type as any,
					amount: Number(cost.amount || 0),
					taxxable: cost.taxxable ?? false,
				})),
		lineItems,
	});

	return {
		salesId: order.id,
		slug: order.slug,
		orderId: order.orderId,
		type: (order.type || "order") as "order" | "quote",
		status: order.status || "Draft",
		version:
			persisted?.version ||
			`${order.updatedAt?.getTime() || Date.now()}-${generateRandomString(6)}`,
		updatedAt:
			persisted?.updatedAt ||
			order.updatedAt?.toISOString() ||
			new Date().toISOString(),
		customer: order.customer,
		settings,
		form: {
			customerId: order.customerId,
			customerProfileId: order.customerProfileId,
			billingAddressId: order.billingAddressId,
			shippingAddressId: order.shippingAddressId,
			paymentTerm: order.paymentTerm || DEFAULT_PAYMENT_TERM,
			paymentMethod:
				(persisted?.form?.paymentMethod as string | null | undefined) || null,
			goodUntil: order.goodUntil?.toISOString() || null,
			prodDueDate: order.prodDueDate?.toISOString() || null,
			po: null,
			notes: null,
			deliveryOption: order.deliveryOption || DEFAULT_DELIVERY_OPTION,
			taxCode: null,
			...(persisted?.form || {}),
		},
		lineItems,
		extraCosts: persistedExtraCosts.length
			? persistedExtraCosts
			: order.extraCosts.map((cost) => ({
					id: cost.id,
					label: cost.label,
					type: cost.type as any,
					amount: Number(cost.amount || 0),
					taxxable: cost.taxxable,
				})),
		summary: {
			subTotal: Number(order.subTotal ?? summary.subTotal),
			adjustedSubTotal: Number(summary.adjustedSubTotal ?? summary.subTotal),
			taxRate,
			taxTotal: Number(order.tax ?? summary.taxTotal),
			grandTotal: Number(order.grandTotal ?? summary.grandTotal),
			discount: Number(summary.discount || 0),
			discountPct: Number(summary.discountPct || 0),
			percentDiscountValue: Number(summary.percentDiscountValue || 0),
			labor: Number(summary.labor || 0),
			delivery: Number(summary.delivery || 0),
			otherCosts: Number(summary.otherCosts || 0),
			ccc: Number(summary.ccc || 0),
		},
	};
}

export async function bootstrapNewSalesForm(
	ctx: TRPCContext,
	input: BootstrapNewSalesFormSchema,
) {
	bootstrapNewSalesFormSchema.parse(input);
	const [setting, selectedCustomer] = await Promise.all([
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
			select: {
				meta: true,
			},
		}),
		input.customerId
			? ctx.db.customers.findFirst({
					where: {
						id: input.customerId,
					},
					select: {
						id: true,
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
					},
				})
			: null,
	]);
	const settings = deriveNewSalesFormSettings(setting?.meta);
	const now = new Date().toISOString();
	return {
		salesId: null,
		slug: null,
		orderId: null,
		type: input.type,
		status: "Draft",
		version: `new-${Date.now()}-${generateRandomString(6)}`,
		updatedAt: now,
		customer: selectedCustomer,
		settings,
		form: {
			customerId: input.customerId || null,
			customerProfileId: settings.customerProfileId,
			billingAddressId: null,
			shippingAddressId: null,
			paymentTerm: DEFAULT_PAYMENT_TERM,
			paymentMethod: null,
			goodUntil: null,
			prodDueDate: null,
			po: null,
			notes: null,
			deliveryOption: DEFAULT_DELIVERY_OPTION,
			taxCode: settings.taxCode,
		},
		lineItems: [],
		extraCosts: [
			{
				id: null,
				label: "Labor",
				type: "Labor",
				amount: 0,
				taxxable: false,
			},
		],
		summary: {
			subTotal: 0,
			adjustedSubTotal: 0,
			taxRate: 0,
			taxTotal: 0,
			grandTotal: 0,
			discount: 0,
			discountPct: 0,
			percentDiscountValue: 0,
			labor: 0,
			delivery: 0,
			otherCosts: 0,
			ccc: 0,
		},
	};
}

export async function getNewSalesForm(
	ctx: TRPCContext,
	input: GetNewSalesFormSchema,
) {
	getNewSalesFormSchema.parse(input);
	const [order, setting] = await Promise.all([
		ctx.db.salesOrders.findFirst({
			where: {
				slug: input.slug,
				type: input.type,
				deletedAt: null,
			},
			select: {
				id: true,
				slug: true,
				orderId: true,
				type: true,
				status: true,
				customerId: true,
				customerProfileId: true,
				billingAddressId: true,
				shippingAddressId: true,
				paymentTerm: true,
				goodUntil: true,
				prodDueDate: true,
				deliveryOption: true,
				extraCosts: {
					select: {
						id: true,
						label: true,
						type: true,
						amount: true,
						taxxable: true,
					},
				},
				taxPercentage: true,
				subTotal: true,
				tax: true,
				grandTotal: true,
				updatedAt: true,
				meta: true,
				customer: {
					select: {
						id: true,
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
					},
				},
				items: {
					where: {
						deletedAt: null,
					},
					select: {
						id: true,
						description: true,
						qty: true,
						rate: true,
						total: true,
						meta: true,
						deletedAt: true,
						formSteps: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								stepId: true,
								componentId: true,
								prodUid: true,
								value: true,
								qty: true,
								price: true,
								basePrice: true,
								meta: true,
								step: {
									select: {
										id: true,
										uid: true,
										title: true,
									},
								},
							},
						},
						shelfItems: {
							where: {
								deletedAt: null,
							},
							select: {
								id: true,
								categoryId: true,
								productId: true,
								description: true,
								qty: true,
								unitPrice: true,
								totalPrice: true,
								meta: true,
							},
						},
						housePackageTool: {
							select: {
								id: true,
								deletedAt: true,
								height: true,
								doorType: true,
								doorId: true,
								dykeDoorId: true,
								jambSizeId: true,
								casingId: true,
								moldingId: true,
								stepProductId: true,
								totalPrice: true,
								totalDoors: true,
								meta: true,
								molding: {
									select: {
										id: true,
										deletedAt: true,
										title: true,
										value: true,
										price: true,
									},
								},
								doors: {
									where: {
										deletedAt: null,
									},
									select: {
										id: true,
										dimension: true,
										swing: true,
										doorType: true,
										doorPrice: true,
										jambSizePrice: true,
										casingPrice: true,
										unitPrice: true,
										lhQty: true,
										rhQty: true,
										totalQty: true,
										lineTotal: true,
										stepProductId: true,
										meta: true,
									},
								},
							},
						},
					},
					orderBy: {
						id: "asc",
					},
				},
			},
		}),
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
			select: {
				meta: true,
			},
		}),
	]);

	if (!order) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Sales form not found.",
		});
	}
	return toBootstrapPayload(order, deriveNewSalesFormSettings(setting?.meta));
}

export async function getNewSalesFormStepRouting(
	ctx: TRPCContext,
	input: GetNewSalesFormStepRoutingSchema,
) {
	getNewSalesFormStepRoutingSchema.parse(input);
	const [setting, steps] = await Promise.all([
		ctx.db.settings.findFirst({
			where: {
				type: "sales-settings",
			},
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
					},
					select: {
						id: true,
						uid: true,
						name: true,
						img: true,
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

export async function searchNewSalesCustomers(
	ctx: TRPCContext,
	input: SearchNewSalesCustomersSchema,
) {
	const data = searchNewSalesCustomersSchema.parse(input);
	const query = data.query?.trim();
	if (!query && !data.recent) return [];

	const mapCustomerResult = (customer: {
		id: number;
		name: string | null;
		businessName: string | null;
		phoneNo: string | null;
		email: string | null;
		profile: {
			id: number;
			title: string | null;
		} | null;
		taxProfiles: Array<{
			tax: {
				title: string | null;
				taxCode: string | null;
			} | null;
		}>;
		addressBooks: Array<{
			id: number;
			name: string | null;
			address1: string | null;
			address2: string | null;
			city: string | null;
			state: string | null;
			country: string | null;
			phoneNo: string | null;
			email: string | null;
			meta: unknown;
			isPrimary: boolean | null;
		}>;
	}) => {
		const businessName = String(customer?.businessName || "").trim();
		const [taxProfile] = customer.taxProfiles || [];
		const [addressBook] = customer.addressBooks || [];
		const shippingLines = addressBook
			? salesAddressLines(addressBook as any, customer as any)
			: [];
		return {
			id: Number(customer?.id || 0),
			customerId: Number(customer?.id || 0),
			name: String(customer?.name || ""),
			businessName,
			phoneNo: String(customer?.phoneNo || ""),
			phone: String(customer?.phoneNo || ""),
			email: String(customer?.email || ""),
			profileId:
				customer?.profile?.id == null ? null : Number(customer.profile.id || 0),
			profileName: String(customer?.profile?.title || ""),
			taxName: String(taxProfile?.tax?.title || ""),
			taxCode: String(taxProfile?.tax?.taxCode || ""),
			billingAddressId:
				addressBook?.id == null ? null : Number(addressBook.id || 0),
			shippingAddressId:
				addressBook?.id == null ? null : Number(addressBook.id || 0),
			shippingAddress: shippingLines.join(", "),
			shippingAddressLines: shippingLines,
			isBusiness: businessName.length > 0,
		};
	};

	if (data.recent && !query) {
		const recentOrders = await ctx.db.salesOrders.findMany({
			take: 25,
			where: {
				deletedAt: null,
				customerId: {
					not: null,
				},
				type: data.type || undefined,
			},
			orderBy: {
				updatedAt: "desc",
			},
			select: {
				customerId: true,
				customer: {
					select: {
						id: true,
						name: true,
						businessName: true,
						phoneNo: true,
						email: true,
						profile: {
							select: {
								id: true,
								title: true,
							},
						},
						taxProfiles: {
							take: 1,
							select: {
								tax: {
									select: {
										title: true,
										taxCode: true,
									},
								},
							},
						},
						addressBooks: {
							take: 1,
							orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
							select: {
								id: true,
								name: true,
								address1: true,
								address2: true,
								city: true,
								state: true,
								country: true,
								phoneNo: true,
								email: true,
								meta: true,
								isPrimary: true,
							},
						},
					},
				},
			},
		});
		const recentCustomers = recentOrders
			.map((order) => order.customer)
			.filter((customer): customer is NonNullable<typeof customer> =>
				Boolean(customer),
			);
		const deduped = new Map<number, (typeof recentCustomers)[number]>();
		for (const customer of recentCustomers) {
			if (!deduped.has(customer.id)) {
				deduped.set(customer.id, customer);
			}
			if (deduped.size >= data.limit) break;
		}
		return Array.from(deduped.values()).map(mapCustomerResult);
	}

	const customers = await ctx.db.customers.findMany({
		take: data.limit,
		distinct: ["id"],
		where: {
			OR: [
				{ name: { contains: query } },
				{ businessName: { contains: query } },
				{ phoneNo: { contains: query } },
				{ email: { contains: query } },
				{ address: { contains: query } },
				{
					addressBooks: {
						some: {
							OR: [
								{ name: { contains: query } },
								{ address1: { contains: query } },
								{ address2: { contains: query } },
								{ city: { contains: query } },
								{ state: { contains: query } },
								{ country: { contains: query } },
								{ phoneNo: { contains: query } },
								{ email: { contains: query } },
							],
						},
					},
				},
			],
		},
		select: {
			id: true,
			name: true,
			businessName: true,
			phoneNo: true,
			email: true,
			profile: {
				select: {
					id: true,
					title: true,
				},
			},
			taxProfiles: {
				take: 1,
				select: {
					tax: {
						select: {
							title: true,
							taxCode: true,
						},
					},
				},
			},
			addressBooks: {
				take: 1,
				orderBy: [{ isPrimary: "desc" }, { id: "asc" }],
				select: {
					id: true,
					name: true,
					address1: true,
					address2: true,
					city: true,
					state: true,
					country: true,
					phoneNo: true,
					email: true,
					meta: true,
					isPrimary: true,
				},
			},
		},
	});
	return customers.map(mapCustomerResult);
}

export async function getNewSalesFormShelfCategories(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfCategoriesSchema,
) {
	getNewSalesFormShelfCategoriesSchema.parse(input);
	return ctx.db.dykeShelfCategories.findMany({
		where: {
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
			type: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ type: "asc" }, { name: "asc" }],
	});
}

export async function getNewSalesFormShelfProducts(
	ctx: TRPCContext,
	input: GetNewSalesFormShelfProductsSchema,
) {
	const payload = getNewSalesFormShelfProductsSchema.parse(input);
	if (!payload.categoryIds.length) return [];
	return ctx.db.dykeShelfProducts.findMany({
		where: {
			deletedAt: null,
			OR: [
				{
					categoryId: {
						in: payload.categoryIds,
					},
				},
				{
					parentCategoryId: {
						in: payload.categoryIds,
					},
				},
			],
		},
		select: {
			id: true,
			title: true,
			img: true,
			unitPrice: true,
			categoryId: true,
			parentCategoryId: true,
		},
		orderBy: [{ title: "asc" }],
	});
}

export async function recalculateNewSalesForm(
	ctx: TRPCContext,
	input: RecalculateNewSalesFormSchema,
) {
	const data = recalculateNewSalesFormSchema.parse(input);
	const setting = await ctx.db.settings.findFirst({
		where: {
			type: "sales-settings",
		},
		select: {
			meta: true,
		},
	});
	return recalculateSummary({
		...data,
		cccPercentage: deriveNewSalesFormSettings(setting?.meta).cccPercentage,
	});
}

export async function resolveNewSalesCustomer(
	ctx: TRPCContext,
	input: ResolveNewSalesCustomerSchema,
) {
	const payload = resolveNewSalesCustomerSchema.parse(input);
	return getSalesCustomer(ctx, {
		customerId: payload.customerId,
		billingId: payload.billingId,
		shippingId: payload.shippingId,
	});
}

async function saveNewSalesFormInternal(
	ctx: TRPCContext,
	payload: SaveDraftNewSalesFormSchema | SaveFinalNewSalesFormSchema,
	status: string,
) {
	const normalizedLines = normalizeLineItems(payload.lineItems);
	const setting = await ctx.db.settings.findFirst({
		where: {
			type: "sales-settings",
		},
		select: {
			meta: true,
		},
	});
	const settings = deriveNewSalesFormSettings(setting?.meta);
	const summary = recalculateSummary({
		taxRate: payload.summary.taxRate,
		extraCosts: payload.extraCosts.map((cost) => ({
			type: cost.type,
			amount: Number(cost.amount || 0),
			taxxable: cost.taxxable ?? false,
		})),
		lineItems: normalizedLines,
		paymentMethod: payload.meta.paymentMethod || null,
		cccPercentage: settings.cccPercentage,
	});

	return ctx.db.$transaction(async (tx) => {
		const isNew = !(payload.salesId || payload.slug);
		let currentId = payload.salesId || null;
		let order = null as null | {
			id: number;
			slug: string;
			orderId: string;
			meta: unknown;
			updatedAt: Date | null;
			paymentTerm: string | null;
			goodUntil: Date | null;
			prodDueDate: Date | null;
			payments: { amount: number | null; status: string | null }[];
		};

		if (payload.salesId || payload.slug) {
			order = await tx.salesOrders.findFirst({
				where: {
					id: payload.salesId || undefined,
					slug: payload.slug || undefined,
					type: payload.type,
					deletedAt: null,
				},
				select: {
					id: true,
					slug: true,
					orderId: true,
					meta: true,
					updatedAt: true,
					paymentTerm: true,
					goodUntil: true,
					prodDueDate: true,
					payments: {
						where: {
							deletedAt: null,
						},
						select: {
							amount: true,
							status: true,
						},
					},
				},
			});
			if (!order) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Sales form not found for save.",
				});
			}
			currentId = order.id;
		}

		const currentMeta = safeMeta(order?.meta);
		const currentVersion = currentMeta.newSalesForm?.version;
		if (
			currentVersion &&
			payload.version &&
			currentVersion !== payload.version
		) {
			throw new TRPCError({
				code: "CONFLICT",
				message:
					"This form changed elsewhere. Reload the latest version before saving.",
			});
		}

		const nextVersion = `${Date.now()}-${generateRandomString(8)}`;
		const nextMeta: NewSalesFormContainer = {
			...currentMeta,
			newSalesForm: {
				version: nextVersion,
				updatedAt: new Date().toISOString(),
				autosave: payload.autosave,
				lineItems: normalizedLines,
				extraCosts: payload.extraCosts,
				summary,
				form: payload.meta,
			},
		};
		const nextAmountDue =
			order?.id != null
				? projectLegacyOrderPayments({
						salesOrderId: order.id,
						grandTotal: summary.grandTotal,
						payments: order.payments || [],
					}).amountDue
				: summary.grandTotal;

		if (!order) {
			const identity = await generateSalesIdentity(ctx, payload.type);
			const created = await tx.salesOrders.create({
				data: {
					orderId: identity.orderId,
					slug: identity.slug,
					type: payload.type,
					status,
					isDyke: true,
					customerId: payload.meta.customerId || null,
					customerProfileId: payload.meta.customerProfileId || null,
					billingAddressId: payload.meta.billingAddressId || null,
					shippingAddressId: payload.meta.shippingAddressId || null,
					paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
					goodUntil: safeDate(payload.meta.goodUntil),
					prodDueDate: safeDate(payload.meta.prodDueDate),
					deliveryOption:
						payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
					taxPercentage: summary.taxRate,
					subTotal: summary.subTotal,
					tax: summary.taxTotal,
					grandTotal: summary.grandTotal,
					amountDue: nextAmountDue,
					meta: nextMeta as any,
				},
				select: {
					id: true,
					slug: true,
					orderId: true,
				},
			});
			currentId = created.id;
			order = {
				...created,
				meta: nextMeta,
				updatedAt: new Date(),
				paymentTerm: payload.meta.paymentTerm || DEFAULT_PAYMENT_TERM,
				goodUntil: safeDate(payload.meta.goodUntil),
				prodDueDate: safeDate(payload.meta.prodDueDate),
				payments: [],
			};
		} else {
			await tx.salesOrders.update({
				where: {
					id: order.id,
				},
				data: {
					status,
					customerId: payload.meta.customerId || null,
					customerProfileId: payload.meta.customerProfileId || null,
					billingAddressId: payload.meta.billingAddressId || null,
					shippingAddressId: payload.meta.shippingAddressId || null,
					paymentTerm:
						payload.meta.paymentTerm ||
						order.paymentTerm ||
						DEFAULT_PAYMENT_TERM,
					goodUntil: safeDate(payload.meta.goodUntil) || order.goodUntil,
					prodDueDate: safeDate(payload.meta.prodDueDate) || order.prodDueDate,
					deliveryOption:
						payload.meta.deliveryOption || DEFAULT_DELIVERY_OPTION,
					taxPercentage: summary.taxRate,
					subTotal: summary.subTotal,
					tax: summary.taxTotal,
					grandTotal: summary.grandTotal,
					amountDue: nextAmountDue,
					meta: nextMeta as any,
				},
			});
			await tx.salesExtraCosts.updateMany({
				where: {
					orderId: order.id,
				},
				data: {
					amount: 0,
				},
			});
			await tx.salesOrderItems.updateMany({
				where: {
					salesOrderId: order.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			await tx.dykeStepForm.updateMany({
				where: {
					salesId: order.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			await tx.dykeSalesShelfItem.updateMany({
				where: {
					salesOrderItem: {
						salesOrderId: order.id,
					},
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			await tx.housePackageTools.updateMany({
				where: {
					salesOrderId: order.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
			await tx.dykeSalesDoors.updateMany({
				where: {
					salesOrderId: order.id,
					deletedAt: null,
				},
				data: {
					deletedAt: new Date(),
				},
			});
		}

		if (!currentId) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Unable to persist sales form.",
			});
		}

		if (normalizedLines.length) {
			for (const line of normalizedLines) {
				const createdItem = await tx.salesOrderItems.create({
					data: {
						salesOrderId: currentId!,
						description: line.description || line.title,
						qty: line.qty,
						rate: line.unitPrice,
						total: line.lineTotal,
						meta: {
							uid: line.uid,
							title: line.title,
							description: line.description,
							meta: line.meta || {},
						} as any,
					},
					select: {
						id: true,
					},
				});

				const formSteps = line.formSteps || [];
				if (formSteps.length) {
					const stepRows = formSteps
						.map((step) => ({
							stepId: Number(step.stepId || step.step?.id || 0),
							componentId: step.componentId || null,
							prodUid: step.prodUid || null,
							value: step.value || null,
							qty: Number(step.qty || 0),
							price: Number(step.price || 0),
							basePrice: Number(step.basePrice || 0),
							meta: safeRecord(step.meta) as any,
							salesId: currentId!,
							salesItemId: createdItem.id,
						}))
						.filter((step) => step.stepId > 0);
					if (stepRows.length) {
						await tx.dykeStepForm.createMany({
							data: stepRows,
						});
					}
				}

				const shelfItems = line.shelfItems || [];
				if (shelfItems.length) {
					const shelfRows = shelfItems
						.map((shelf) => ({
							salesOrderItemId: createdItem.id,
							categoryId: Number(shelf.categoryId || 0),
							productId: shelf.productId || null,
							description: shelf.description || null,
							qty: Number(shelf.qty || 0),
							unitPrice: Math.round(Number(shelf.unitPrice || 0)),
							totalPrice: Math.round(Number(shelf.totalPrice || 0)),
							meta: safeRecord(shelf.meta) as any,
						}))
						.filter((shelf) => shelf.categoryId > 0);
					if (shelfRows.length) {
						await tx.dykeSalesShelfItem.createMany({
							data: shelfRows,
						});
					}
				}

				const hpt = line.housePackageTool;
				const hasHpt =
					!!hpt &&
					(!!hpt.doorType ||
						!!hpt.dykeDoorId ||
						!!hpt.doorId ||
						!!hpt.moldingId ||
						!!hpt.stepProductId ||
						!!hpt.totalDoors ||
						!!hpt.totalPrice ||
						!!(hpt.doors || []).length);

				if (hasHpt && hpt) {
					const createdHpt = await tx.housePackageTools.create({
						data: {
							salesOrderId: currentId!,
							orderItemId: createdItem.id,
							height: hpt.height || null,
							doorType: hpt.doorType || null,
							doorId: hpt.doorId || null,
							dykeDoorId: hpt.dykeDoorId || null,
							jambSizeId: hpt.jambSizeId || null,
							casingId: hpt.casingId || null,
							moldingId: hpt.moldingId || null,
							stepProductId: hpt.stepProductId || null,
							totalPrice: Number(hpt.totalPrice || 0),
							totalDoors: Number(hpt.totalDoors || 0),
							meta: safeRecord(hpt.meta) as any,
						},
						select: {
							id: true,
						},
					});

					const doors = (hpt.doors || []).filter(
						(door) =>
							!!door.dimension && (door.lhQty || door.rhQty || door.totalQty),
					);
					if (doors.length) {
						await tx.dykeSalesDoors.createMany({
							data: doors.map((door) => ({
								housePackageToolId: createdHpt.id,
								salesOrderId: currentId!,
								salesOrderItemId: createdItem.id,
								dimension: door.dimension!,
								swing: door.swing || null,
								doorType: door.doorType || hpt.doorType || null,
								doorPrice: Number(door.doorPrice || 0),
								jambSizePrice: Number(door.jambSizePrice || 0),
								casingPrice: Number(door.casingPrice || 0),
								unitPrice: Number(door.unitPrice || 0),
								lhQty: Math.round(Number(door.lhQty || 0)),
								rhQty: Math.round(Number(door.rhQty || 0)),
								totalQty: Math.round(
									Number(door.totalQty || 0) ||
										Number(door.lhQty || 0) + Number(door.rhQty || 0),
								),
								lineTotal: Number(door.lineTotal || 0),
								stepProductId: door.stepProductId || null,
								meta: safeRecord(door.meta) as any,
							})),
						});
					}
				}
			}
		}

		if (payload.extraCosts.length) {
			const existingCostIds = payload.extraCosts
				.map((cost) => Number(cost.id || 0))
				.filter((id) => id > 0);

			await tx.salesExtraCosts.deleteMany({
				where: {
					orderId: currentId,
					id: {
						notIn: existingCostIds.length ? existingCostIds : [0],
					},
				},
			});

			for (const cost of payload.extraCosts) {
				if (cost.id) {
					await tx.salesExtraCosts.update({
						where: { id: cost.id },
						data: {
							label: cost.label,
							amount: Number(cost.amount || 0),
							type: cost.type as any,
							taxxable: cost.taxxable ?? false,
						},
					});
					continue;
				}
				await tx.salesExtraCosts.create({
					data: {
						orderId: currentId!,
						label: cost.label,
						amount: Number(cost.amount || 0),
						type: cost.type as any,
						taxxable: cost.taxxable ?? false,
					},
				});
			}
		}

		await tx.salesTaxes.deleteMany({
			where: {
				salesId: currentId,
			},
		});

		if (payload.meta.taxCode) {
			await tx.salesTaxes.create({
				data: {
					salesId: currentId,
					taxCode: payload.meta.taxCode,
					taxxable: summary.taxableSubTotal,
					tax: summary.taxTotal,
				},
			});
		}

		if (supportsInventorySync(tx)) {
			await syncSalesInventoryLineItems(tx, {
				salesOrderId: currentId,
				source: "new-form",
			});
		}

		return {
			salesId: currentId,
			slug: order.slug,
			orderId: order.orderId,
			type: payload.type,
			isNew,
			version: nextVersion,
			updatedAt: nextMeta.newSalesForm?.updatedAt,
			summary,
			status,
		};
	});
}

export async function saveDraftNewSalesForm(
	ctx: TRPCContext,
	input: SaveDraftNewSalesFormSchema,
) {
	const payload = saveDraftNewSalesFormSchema.parse(input);
	const result = await saveNewSalesFormInternal(ctx, payload, "Draft");
	const isQuote = result.type === "quote";
	await expireCurrentSalesDocumentSnapshots({
		db: ctx.db,
		salesOrderId: result.salesId,
		reason: "invoice_updated",
		documentPrefixes: isQuote
			? ["quote_pdf"]
			: [
					"invoice_pdf",
					"production_pdf",
					"packing_slip_pdf",
					"order_packing_pdf",
					"quote_pdf",
				],
	});
	await queueSalesDocumentSnapshotWarmups(
		isQuote
			? [{ salesOrderId: result.salesId, mode: "quote" }]
			: [
					{ salesOrderId: result.salesId, mode: "invoice" },
					{ salesOrderId: result.salesId, mode: "production" },
					{ salesOrderId: result.salesId, mode: "packing-slip" },
					{ salesOrderId: result.salesId, mode: "order-packing" },
				],
	);
	return result;
}

export async function saveFinalNewSalesForm(
	ctx: TRPCContext,
	input: SaveFinalNewSalesFormSchema,
) {
	const payload = saveFinalNewSalesFormSchema.parse(input);
	const result = await saveNewSalesFormInternal(ctx, payload, "Active");
	const isQuote = result.type === "quote";
	await expireCurrentSalesDocumentSnapshots({
		db: ctx.db,
		salesOrderId: result.salesId,
		reason: "invoice_updated",
		documentPrefixes: isQuote
			? ["quote_pdf"]
			: [
					"invoice_pdf",
					"production_pdf",
					"packing_slip_pdf",
					"order_packing_pdf",
					"quote_pdf",
				],
	});
	await queueSalesDocumentSnapshotWarmups(
		isQuote
			? [{ salesOrderId: result.salesId, mode: "quote" }]
			: [
					{ salesOrderId: result.salesId, mode: "invoice" },
					{ salesOrderId: result.salesId, mode: "production" },
					{ salesOrderId: result.salesId, mode: "packing-slip" },
					{ salesOrderId: result.salesId, mode: "order-packing" },
				],
	);
	return result;
}

export async function deleteNewSalesFormLineItem(
	ctx: TRPCContext,
	input: DeleteNewSalesFormLineItemSchema,
) {
	const payload = deleteNewSalesFormLineItemSchema.parse(input);
	const line = await ctx.db.salesOrderItems.findFirst({
		where: {
			id: payload.lineItemId,
			salesOrderId: payload.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
		},
	});
	if (!line) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Line item not found.",
		});
	}
	await ctx.db.salesOrderItems.update({
		where: {
			id: line.id,
		},
		data: {
			deletedAt: new Date(),
		},
	});
	return {
		ok: true,
		lineItemId: payload.lineItemId,
	};
}
