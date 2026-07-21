import { createHash } from "node:crypto";
import { getNewSalesFormStepRouting } from "@api/db/queries/new-sales-form";
import { getStepComponents } from "@api/db/queries/sales-form";
import type { TRPCContext } from "@api/trpc/init";
import { addMoney, multiplyMoney, roundMoney } from "@gnd/sales/payment-system";
import { salesFormPortableLineItemSchema } from "@gnd/sales/sales-form/contracts/schemas";
import {
	computeHptSharedDoorSurcharge,
	normalizeHptDoorRowForLegacy,
} from "@gnd/sales/sales-form/domain/hpt-compatibility";
import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	isComponentVisibleByRules,
	resolveComponentPriceByDeps,
} from "@gnd/sales/sales-form/domain/step-engine";
import {
	deriveDoorSizeCandidates,
	getRouteConfigForLine,
	resolveDoorTierPricing,
} from "@gnd/sales/sales-form/domain/workflow-calculators";
import {
	type PublicStorefrontStep,
	isStorefrontStepWaivedBySelection,
	normalizeStorefrontAvailability,
	projectStorefrontOfferRoute,
	resolveStorefrontProductTypes,
} from "@gnd/sales/storefront-configuration";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const storefrontConfigurationInputSchema = z.object({
	offerId: z.string().trim().min(1),
	quantity: z.number().positive().max(10_000),
	configuration: salesFormPortableLineItemSchema,
});

export const storefrontCollectionTypeSchema = z.enum(["CART", "WISHLIST"]);

export type StorefrontConfigurationInput = z.infer<
	typeof storefrontConfigurationInputSchema
>;

function safeString(value: unknown) {
	return String(value ?? "").trim();
}

function safeRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function findConfiguredStep(
	configuration: StorefrontConfigurationInput["configuration"],
	stepUid: string,
) {
	return (configuration.formSteps ?? []).find(
		(step) =>
			safeString(step.step?.uid) === stepUid ||
			safeString(safeRecord(step.meta).stepUid) === stepUid,
	);
}

async function loadPublishedOffer(ctx: TRPCContext, offerId: string) {
	const offer = await ctx.db.storefrontOffer.findFirst({
		where: {
			id: offerId,
			status: "PUBLISHED",
			publishedAt: { lte: new Date() },
			deletedAt: null,
			category: {
				status: "PUBLISHED",
				publishedAt: { lte: new Date() },
				deletedAt: null,
			},
		},
		include: {
			category: true,
			stepPolicies: { orderBy: { sortOrder: "asc" } },
			componentPolicies: { orderBy: { sortOrder: "asc" } },
		},
	});
	if (!offer) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "This storefront product is unavailable.",
		});
	}
	const availability = normalizeStorefrontAvailability(offer.availability);
	if (!availability.purchasable) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message:
				availability.message ||
				"This product is currently available for browsing only.",
		});
	}
	return offer;
}

function selectedUidsForStep(
	step: PublicStorefrontStep,
	configuredStep: ReturnType<typeof findConfiguredStep>,
) {
	const metadata = safeRecord(configuredStep?.meta);
	const selected = new Set<string>();
	const direct = safeString(configuredStep?.prodUid);
	if (direct) selected.add(direct);
	const multiple = Array.isArray(metadata.selectedProdUids)
		? metadata.selectedProdUids
		: [];
	for (const uid of multiple) {
		const normalized = safeString(uid);
		if (normalized) selected.add(normalized);
	}
	if (!selected.size && step.selectedComponentUid) {
		selected.add(step.selectedComponentUid);
	}
	return Array.from(selected);
}

export async function validateAndPriceStorefrontConfiguration(
	ctx: TRPCContext,
	rawInput: StorefrontConfigurationInput,
	options?: {
		requireWorkflowConfiguration?: boolean;
		allowIncomplete?: boolean;
	},
) {
	const input = storefrontConfigurationInputSchema.parse(rawInput);
	const [offer, routeData] = await Promise.all([
		loadPublishedOffer(ctx, input.offerId),
		getNewSalesFormStepRouting(ctx, {}),
	]);
	const productTypes = resolveStorefrontProductTypes({
		routeData,
		rootStepUid: offer.category.rootStepUid,
		fallbackRootComponentUid: offer.category.rootComponentUid,
		offerSourceStepUid: offer.sourceStepUid,
		offerSourceComponentUid: offer.sourceComponentUid,
	});
	const configuredRoot = findConfiguredStep(
		input.configuration,
		offer.category.rootStepUid,
	);
	const requestedRootComponentUid =
		safeString(configuredRoot?.prodUid) || offer.category.rootComponentUid;
	if (
		!productTypes.some(
			(component) => component.uid === requestedRootComponentUid,
		)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "The selected product type is unavailable.",
		});
	}
	const route = routeData.composedRouter[requestedRootComponentUid] || null;
	const stepUids = [
		offer.category.rootStepUid,
		...(route?.routeSequence.map((step) => step.uid) ?? []),
	];
	const overlays = await ctx.db.storefrontComponent.findMany({
		where: {
			sourceStepUid: { in: stepUids },
			availableOnStorefront: true,
			status: "PUBLISHED",
			deletedAt: null,
		},
		take: 5_000,
	});
	const policy = projectStorefrontOfferRoute({
		routeData,
		rootStepUid: offer.category.rootStepUid,
		rootComponentUid: requestedRootComponentUid,
		rootComponentUids: productTypes.map((component) => component.uid),
		offerSourceStepUid: offer.sourceStepUid,
		offerSourceComponentUid: offer.sourceComponentUid,
		stepPolicies: offer.stepPolicies.map((step) => ({
			...step,
			metadata: (step.metadata as Record<string, unknown> | null) || null,
		})),
		componentPolicies: offer.componentPolicies.map((component) => ({
			...component,
			metadata: (component.metadata as Record<string, unknown> | null) || null,
		})),
		components: overlays.map((component) => ({
			...component,
			metadata: (component.metadata as Record<string, unknown> | null) || null,
		})),
	});
	if (!policy.ready) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "This product configuration is temporarily unavailable.",
		});
	}

	const selectedSteps = policy.steps.map((step) => {
		const configuredStep = findConfiguredStep(
			input.configuration,
			step.stepUid,
		);
		const selectedUids = selectedUidsForStep(step, configuredStep);
		const allowed = new Set(step.components.map((component) => component.uid));
		for (const uid of selectedUids) {
			if (!allowed.has(uid)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `The selected ${step.title} option is unavailable.`,
				});
			}
		}
		return { step, configuredStep, selectedUids };
	});

	const selectedByStepUid = Object.fromEntries(
		selectedSteps.flatMap((selection) => {
			const selectedUid = selection.selectedUids[0];
			return selectedUid ? [[selection.step.stepUid, selectedUid]] : [];
		}),
	);
	const selectedProdUidsByStepUid = Object.fromEntries(
		selectedSteps.map((selection) => [
			selection.step.stepUid,
			selection.selectedUids,
		]),
	);
	const pricedSteps: Array<Record<string, unknown>> = [];
	const componentUnitPrices: number[] = [];
	const resolvedSteps: PublicStorefrontStep[] = [];
	let configurationComplete = true;
	const routeStepIds = policy.steps.flatMap((step) =>
		step.stepUid !== offer.category.rootStepUid && step.stepId
			? [step.stepId]
			: [],
	);
	const routeComponents = routeStepIds.length
		? ((await getStepComponents(ctx, {
				stepIds: routeStepIds,
			})) as Array<Record<string, unknown>>)
		: [];
	const routeComponentsByStepUid = new Map<
		string,
		Array<Record<string, unknown>>
	>();
	for (const component of routeComponents) {
		const stepUid = safeString(component.stepUid);
		if (!stepUid) continue;
		const components = routeComponentsByStepUid.get(stepUid) ?? [];
		components.push(component);
		routeComponentsByStepUid.set(stepUid, components);
	}
	const selectedCanonicalByStepUid = new Map<
		string,
		Array<Record<string, unknown>>
	>();

	for (const selection of selectedSteps) {
		const waivedBySelection = isStorefrontStepWaivedBySelection(
			selection.step,
			policy.steps,
			selectedByStepUid,
		);
		const canonicalComponents: Array<Record<string, unknown>> = (
			selection.step.stepUid === offer.category.rootStepUid
				? (routeData.stepsByUid[selection.step.stepUid]?.components ?? [])
				: (routeComponentsByStepUid.get(selection.step.stepUid) ?? [])
		) as Array<Record<string, unknown>>;
		const byUid = new Map(
			canonicalComponents.map((component) => [
				safeString(component.uid),
				component,
			]),
		);
		const publishedUids = new Set(
			selection.step.components.map((component) => component.uid),
		);
		const visibleUids = new Set(
			canonicalComponents
				.filter((component) => publishedUids.has(safeString(component.uid)))
				.filter(
					(component) =>
						selection.step.stepUid === offer.category.rootStepUid ||
						isComponentVisibleByRules(
							component,
							selectedByStepUid,
							selectedProdUidsByStepUid,
						),
				)
				.map((component) => safeString(component.uid)),
		);
		const visibleComponents = selection.step.components.filter((component) =>
			visibleUids.has(component.uid),
		);
		const pricedVisibleComponents = visibleComponents.map((publicOption) => {
			if (selection.step.stepUid === offer.category.rootStepUid) {
				return { ...publicOption, price: 0, basePrice: 0 };
			}
			const canonical = byUid.get(publicOption.uid);
			if (!canonical) return publicOption;
			const pricing = resolveComponentPriceByDeps(
				canonical,
				selectedByStepUid,
				{ selectedProdUidsByStepUid },
			);
			const price = Number(pricing.salesPrice);
			const basePrice = Number(pricing.basePrice);
			return {
				...publicOption,
				price: Number.isFinite(price) ? roundMoney(price) : null,
				basePrice: Number.isFinite(basePrice) ? roundMoney(basePrice) : null,
			};
		});
		const resolvedStep = {
			...selection.step,
			visible:
				selection.step.visible &&
				visibleComponents.length > 0 &&
				!waivedBySelection,
			components: pricedVisibleComponents,
		};
		resolvedSteps.push(resolvedStep);
		const selectedVisibleUids = selection.selectedUids.filter((uid) =>
			visibleUids.has(uid),
		);
		if (
			resolvedStep.visible &&
			resolvedStep.required &&
			!resolvedStep.allowSkip &&
			!selectedVisibleUids.length
		) {
			configurationComplete = false;
			if (!options?.allowIncomplete) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Choose an option for ${selection.step.title}.`,
				});
			}
		}
		if (selectedVisibleUids.length !== selection.selectedUids.length) {
			configurationComplete = false;
		}
		const selectedComponents = selectedVisibleUids.map((uid) => {
			const component = byUid.get(uid);
			if (!component) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `The selected ${selection.step.title} option no longer exists.`,
				});
			}
			if (
				selection.step.stepUid !== offer.category.rootStepUid &&
				!isComponentVisibleByRules(
					component,
					selectedByStepUid,
					selectedProdUidsByStepUid,
				)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `The selected ${selection.step.title} combination is invalid.`,
				});
			}
			const pricing =
				selection.step.stepUid === offer.category.rootStepUid
					? { salesPrice: 0, basePrice: 0 }
					: resolveComponentPriceByDeps(component, selectedByStepUid, {
							selectedProdUidsByStepUid,
						});
			const salesPrice = Number(pricing.salesPrice);
			if (!Number.isFinite(salesPrice) || salesPrice < 0) {
				throw new TRPCError({
					code: "PRECONDITION_FAILED",
					message: `${selection.step.title} does not have a valid online price.`,
				});
			}
			componentUnitPrices.push(salesPrice);
			return {
				id: component.id ?? null,
				uid,
				title:
					safeString(
						selection.step.components.find((item) => item.uid === uid)?.title,
					) || selection.step.title,
				price: roundMoney(salesPrice),
				basePrice: roundMoney(pricing.basePrice),
			};
		});
		selectedCanonicalByStepUid.set(
			selection.step.stepUid,
			selectedVisibleUids
				.map((uid) => byUid.get(uid))
				.filter((component): component is Record<string, unknown> =>
					Boolean(component),
				),
		);
		if (!selectedComponents.length) continue;
		const primary = selectedComponents[0];
		pricedSteps.push({
			id: null,
			stepId: selection.step.stepId,
			componentId: primary?.id ?? null,
			prodUid: primary?.uid ?? "",
			value: primary?.title ?? "",
			qty: input.quantity,
			price: addMoney(
				...selectedComponents.map((component) => component.price),
			),
			basePrice: addMoney(
				...selectedComponents.map((component) => component.basePrice),
			),
			meta: {
				selectedProdUids: selectedComponents.map((component) => component.uid),
				selectedComponents,
			},
			step: {
				id: selection.step.stepId,
				uid: selection.step.stepUid,
				title: selection.step.title,
			},
		});
	}

	const requestedShelfItems = input.configuration.shelfItems ?? [];
	const shelfProductIds = requestedShelfItems
		.map((item) => Number(item.productId || 0))
		.filter((id) => id > 0);
	const shelfProducts = shelfProductIds.length
		? await ctx.db.dykeShelfProducts.findMany({
				where: {
					id: { in: shelfProductIds },
					deletedAt: null,
				},
				select: {
					id: true,
					title: true,
					unitPrice: true,
					categoryId: true,
					parentCategoryId: true,
				},
			})
		: [];
	const shelfById = new Map(
		shelfProducts.map((product) => [product.id, product]),
	);
	const shelfItems = requestedShelfItems.map((item) => {
		const productId = Number(item.productId || 0);
		const product = shelfById.get(productId);
		if (!product || product.unitPrice == null || product.unitPrice < 0) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "A selected shelf item is unavailable.",
			});
		}
		const qty = Math.max(0, Number(item.qty || 0));
		const unitPrice = roundMoney(product.unitPrice);
		return {
			id: null,
			productId: product.id,
			categoryId: product.categoryId,
			parentCategoryId: product.parentCategoryId,
			description: product.title,
			qty,
			unitPrice,
			totalPrice: multiplyMoney(qty, unitPrice),
			meta: {},
		};
	});
	const doorSelection = selectedSteps.find(
		(selection) => selection.step.title.trim().toLowerCase() === "door",
	);
	const selectedDoors = doorSelection
		? selectedCanonicalByStepUid.get(doorSelection.step.stepUid) || []
		: [];
	const doorScheduleComponents = selectedDoors.flatMap((component) => {
		const pricing = safeRecord(component.pricing);
		const sizes = deriveDoorSizeCandidates(
			{ formSteps: pricedSteps },
			pricing,
			routeData,
		);
		const pricedSizes = sizes.flatMap((dimension) => {
			const tier = resolveDoorTierPricing({
				pricing,
				size: dimension,
				supplierUid: null,
				supplierVariants: Array.isArray(component.supplierVariants)
					? component.supplierVariants
					: [],
				fallbackSalesPrice: Number(component.salesPrice || 0),
				fallbackBasePrice: Number(component.basePrice || 0),
			});
			return tier.hasPrice
				? [
						{
							dimension,
							unitPrice: roundMoney(tier.salesPrice),
							basePrice: roundMoney(tier.basePrice),
						},
					]
				: [];
		});
		return pricedSizes.length
			? [
					{
						stepProductId: Number(component.id || 0),
						componentUid: safeString(component.uid),
						title:
							doorSelection?.step.components.find(
								(item) => item.uid === safeString(component.uid),
							)?.title ||
							safeString(component.name) ||
							"Door",
						sizes: pricedSizes,
					},
				]
			: [];
	});
	const requestedDoorRows = input.configuration.housePackageTool?.doors ?? [];
	if (
		options?.requireWorkflowConfiguration &&
		doorScheduleComponents.length &&
		!requestedDoorRows.some((row) => Number(row.totalQty || 0) > 0)
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Add at least one door size and quantity.",
		});
	}
	const sharedDoorSurcharge = computeHptSharedDoorSurcharge({
		formSteps: pricedSteps,
	});
	const doorRouteConfig = getRouteConfigForLine({
		routeData,
		line: { formSteps: pricedSteps },
		step: null,
	});
	const noHandle = Boolean(doorRouteConfig.noHandle);
	const normalizedDoorRows = requestedDoorRows
		.filter((row) => Number(row.totalQty || 0) > 0)
		.map((row) => {
			const component =
				doorScheduleComponents.find(
					(item) => item.stepProductId === Number(row.stepProductId || 0),
				) || doorScheduleComponents[0];
			const size = component?.sizes.find(
				(item) => item.dimension === row.dimension,
			);
			if (!component || !size) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "A selected door size is unavailable.",
				});
			}
			const lhQty = Math.max(0, Math.floor(Number(row.lhQty || 0)));
			const rhQty = Math.max(0, Math.floor(Number(row.rhQty || 0)));
			const requestedTotal = Math.max(0, Math.floor(Number(row.totalQty || 0)));
			const totalQty = lhQty + rhQty > 0 ? lhQty + rhQty : requestedTotal;
			return normalizeHptDoorRowForLegacy(
				{
					id: null,
					dimension: size.dimension,
					swing: row.swing || "",
					doorType: row.doorType || null,
					stepProductId: component.stepProductId,
					lhQty,
					rhQty,
					totalQty,
					doorPrice: 0,
					jambSizePrice: size.unitPrice,
					unitPrice: addMoney(size.unitPrice, sharedDoorSurcharge),
					meta: {
						baseUnitPrice: size.basePrice,
						doorSalesUnitPrice: size.unitPrice,
						sharedDoorSurcharge,
						storefrontComponentUid: component.componentUid,
					},
				},
				{ sharedDoorSurcharge },
			);
		});
	const hptTotal = addMoney(
		...normalizedDoorRows.map((row) => Number(row.lineTotal || 0)),
	);
	const totalDoors = normalizedDoorRows.reduce(
		(total, row) => total + Number(row.totalQty || 0),
		0,
	);
	const componentUnitPrice = addMoney(...componentUnitPrices);
	const componentLineTotal = multiplyMoney(componentUnitPrice, input.quantity);
	const shelfTotal = addMoney(...shelfItems.map((item) => item.totalPrice));
	const lineTotal = normalizedDoorRows.length
		? addMoney(hptTotal, shelfTotal)
		: addMoney(componentLineTotal, shelfTotal);
	const normalizedQuantity = normalizedDoorRows.length
		? totalDoors
		: input.quantity;
	const unitPrice =
		normalizedQuantity > 0
			? roundMoney(lineTotal / normalizedQuantity)
			: roundMoney(lineTotal);
	const normalizedConfiguration = {
		...input.configuration,
		id: null,
		uid: input.configuration.uid,
		title: offer.title,
		description: offer.description,
		qty: normalizedQuantity,
		unitPrice,
		lineTotal,
		formSteps: pricedSteps,
		shelfItems,
		housePackageTool: normalizedDoorRows.length
			? {
					...(input.configuration.housePackageTool || {}),
					id: null,
					doors: normalizedDoorRows,
					totalDoors,
					totalPrice: lineTotal,
				}
			: input.configuration.housePackageTool || null,
		meta: {
			...safeRecord(input.configuration.meta),
			storefront: {
				offerId: offer.id,
				configurationVersion: offer.configurationVersion,
				categoryId: offer.category.id,
				rootStepUid: offer.category.rootStepUid,
				rootComponentUid: requestedRootComponentUid,
			},
		},
	};
	// Quantity and calculated money are line state, not configuration identity.
	// Keeping them out of the hash lets the same configured product merge into a
	// single cart line while the server remains the only pricing authority.
	const configurationIdentity = {
		offerId: offer.id,
		configurationVersion: offer.configurationVersion,
		steps: selectedSteps.map((selection) => ({
			stepUid: selection.step.stepUid,
			selectedUids: [...selection.selectedUids].sort(),
		})),
		shelfItems: shelfItems
			.map((item) => ({
				productId: item.productId,
				qty: item.qty,
			}))
			.sort((a, b) => a.productId - b.productId),
		housePackageTool: input.configuration.housePackageTool
			? {
					height: input.configuration.housePackageTool.height ?? null,
					doorType: input.configuration.housePackageTool.doorType ?? null,
					doorId: input.configuration.housePackageTool.doorId ?? null,
					dykeDoorId: input.configuration.housePackageTool.dykeDoorId ?? null,
					jambSizeId: input.configuration.housePackageTool.jambSizeId ?? null,
					casingId: input.configuration.housePackageTool.casingId ?? null,
					moldingId: input.configuration.housePackageTool.moldingId ?? null,
					stepProductId:
						input.configuration.housePackageTool.stepProductId ?? null,
					doors: (input.configuration.housePackageTool.doors ?? []).map(
						(door) => ({
							dimension: door.dimension ?? null,
							swing: door.swing ?? null,
							doorType: door.doorType ?? null,
							lhQty: door.lhQty ?? null,
							rhQty: door.rhQty ?? null,
							totalQty: door.totalQty ?? null,
							stepProductId: door.stepProductId ?? null,
						}),
					),
				}
			: null,
	};
	const serialized = JSON.stringify(configurationIdentity);
	const configurationHash = createHash("sha256")
		.update(serialized)
		.digest("hex");

	return {
		offer,
		rootComponentUid: requestedRootComponentUid,
		complete: configurationComplete,
		configuration: normalizedConfiguration,
		configurationHash,
		normalizedQuantity,
		resolvedSteps,
		workflow: {
			doorSchedule: doorScheduleComponents.length
				? {
						required: true,
						noHandle,
						sharedDoorSurcharge,
						components: doorScheduleComponents,
					}
				: null,
		},
		pricingSnapshot: {
			currency: "USD",
			unitPrice,
			lineTotal,
			pricedAt: new Date().toISOString(),
			source: "canonical-dyke-sales-pricing",
		},
		unitPrice,
		lineTotal,
	};
}

export async function resolveStorefrontOwner(ctx: TRPCContext) {
	if (ctx.userId) {
		const customer = await ctx.db.customers.findFirst({
			where: {
				userId: ctx.userId,
				deletedAt: null,
				user: {
					type: "CUSTOMER",
					deletedAt: null,
					accessRevokedAt: null,
				},
			},
			select: { id: true, userId: true },
		});
		if (!customer) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "A customer account is required for storefront shopping.",
			});
		}
		return {
			ownerUserId: ctx.userId,
			customerId: customer.id,
			guestTokenHash: ctx.guestTokenHash,
		};
	}
	if (!ctx.guestTokenHash) {
		throw new TRPCError({
			code: "PRECONDITION_FAILED",
			message: "Guest shopping is unavailable. Refresh and try again.",
		});
	}
	return {
		ownerUserId: null,
		customerId: null,
		guestTokenHash: ctx.guestTokenHash,
	};
}

export async function getOrCreateStorefrontCollection(
	ctx: TRPCContext,
	type: "CART" | "WISHLIST",
) {
	const owner = await resolveStorefrontOwner(ctx);
	return ctx.db.$transaction(async (tx) => {
		const userCollection = owner.ownerUserId
			? await tx.storefrontCommerceCollection.findFirst({
					where: {
						type,
						status: "ACTIVE",
						ownerUserId: owner.ownerUserId,
					},
					include: { lines: true },
				})
			: null;
		const guestCollection = owner.guestTokenHash
			? await tx.storefrontCommerceCollection.findFirst({
					where: {
						type,
						status: "ACTIVE",
						guestTokenHash: owner.guestTokenHash,
						ownerUserId: null,
					},
					include: { lines: true },
				})
			: null;

		if (owner.ownerUserId && userCollection && guestCollection) {
			for (const guestLine of guestCollection.lines) {
				const duplicate = userCollection.lines.find(
					(line) =>
						line.offerId === guestLine.offerId &&
						line.configurationHash === guestLine.configurationHash,
				);
				if (duplicate) {
					const quantity =
						Number(duplicate.quantity) + Number(guestLine.quantity);
					await tx.storefrontCommerceLine.update({
						where: { id: duplicate.id },
						data: {
							quantity,
							lineTotal: multiplyMoney(quantity, Number(duplicate.unitPrice)),
						},
					});
					await tx.storefrontCommerceLine.delete({
						where: { id: guestLine.id },
					});
				} else {
					await tx.storefrontCommerceLine.update({
						where: { id: guestLine.id },
						data: { collectionId: userCollection.id },
					});
				}
			}
			await tx.storefrontCommerceCollection.update({
				where: { id: guestCollection.id },
				data: { status: "COMPLETED" },
			});
			return tx.storefrontCommerceCollection.update({
				where: { id: userCollection.id },
				data: { version: { increment: 1 } },
			});
		}
		if (owner.ownerUserId && guestCollection && !userCollection) {
			return tx.storefrontCommerceCollection.update({
				where: { id: guestCollection.id },
				data: {
					ownerUserId: owner.ownerUserId,
					guestTokenHash: null,
					version: { increment: 1 },
				},
			});
		}
		if (userCollection) return userCollection;
		if (guestCollection) return guestCollection;
		return tx.storefrontCommerceCollection.create({
			data: {
				type,
				status: "ACTIVE",
				ownerUserId: owner.ownerUserId,
				guestTokenHash: owner.ownerUserId ? null : owner.guestTokenHash,
				expiresAt: owner.ownerUserId
					? null
					: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
			},
		});
	});
}

export async function getStorefrontCollection(
	ctx: TRPCContext,
	type: "CART" | "WISHLIST",
) {
	const collection = await getOrCreateStorefrontCollection(ctx, type);
	const result = await ctx.db.storefrontCommerceCollection.findUnique({
		where: { id: collection.id },
		include: {
			lines: { orderBy: { createdAt: "asc" } },
		},
	});
	if (!result) throw new TRPCError({ code: "NOT_FOUND" });
	const offerIds = result.lines
		.map((line) => line.offerId)
		.filter((id): id is string => Boolean(id));
	const offers = offerIds.length
		? await ctx.db.storefrontOffer.findMany({
				where: { id: { in: offerIds } },
				select: {
					id: true,
					slug: true,
					title: true,
					description: true,
					imageUrl: true,
					category: {
						select: { slug: true, title: true },
					},
				},
			})
		: [];
	const offersById = new Map(offers.map((offer) => [offer.id, offer]));
	const items = result.lines.map((line) => ({
		id: line.id,
		offerId: line.offerId,
		offer: line.offerId ? (offersById.get(line.offerId) ?? null) : null,
		quantity: Number(line.quantity),
		configuration: line.configuration,
		configurationVersion: line.configurationVersion,
		unitPrice: Number(line.unitPrice),
		lineTotal: Number(line.lineTotal),
		validationStatus: line.validationStatus,
		validationMessage: line.validationMessage,
	}));
	return {
		id: result.id,
		type: result.type,
		version: result.version,
		currency: result.currency,
		items,
		estimate: {
			subtotal: addMoney(...items.map((item) => item.lineTotal)),
			tax: null,
			shipping: null,
			total: null,
			readyForCheckout: items.every(
				(item) => item.validationStatus === "VALID",
			),
		},
	};
}

export async function assertStorefrontLineOwnership(
	ctx: TRPCContext,
	lineId: string,
	type: "CART" | "WISHLIST",
) {
	const owner = await resolveStorefrontOwner(ctx);
	const line = await ctx.db.storefrontCommerceLine.findFirst({
		where: {
			id: lineId,
			collection: {
				type,
				status: "ACTIVE",
				...(owner.ownerUserId
					? { ownerUserId: owner.ownerUserId }
					: {
							ownerUserId: null,
							guestTokenHash: owner.guestTokenHash,
						}),
			},
		},
		include: { collection: true },
	});
	if (!line) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Cart item not found.",
		});
	}
	return line;
}

export function readStorefrontSelections(configuration: unknown) {
	const parsed = salesFormPortableLineItemSchema.parse(configuration);
	return {
		selectedByStepUid: buildSelectedByStepUid(parsed.formSteps ?? []),
		selectedProdUidsByStepUid: buildSelectedProdUidsByStepUid(
			parsed.formSteps ?? [],
		),
	};
}
