import { buildFulfillmentShortLoadPlan } from "@gnd/sales/fulfillment-short-load-plan";
import { buildFulfillmentCompletionReview } from "@gnd/sales/fulfillment-completion-review";
import { getDispatchPackingCommandRevision } from "./dispatch-packing-command";
import { getShortLoadInventoryContext } from "@gnd/sales/fulfillment-short-load-inventory-context";
import { fulfillmentAssignmentRevision } from "@gnd/sales/fulfillment-assignment-command";
import { resolveDriverRouteDestination } from "@gnd/sales/dispatch-manifest/driver-destination";
import { getDispatchCompletionProof } from "./dispatch-proof-completion";
import type { TRPCContext } from "@api/trpc/init";
import type { DispatchWorkspaceListInput } from "@api/schemas/dispatch-workspace";
import { readFulfillmentAssignmentScope } from "@gnd/sales/fulfillment-assignment-scope";
import {
	dispatchOrderPresentationSelect,
	projectDispatchOrderPresentation,
} from "./dispatch-order-presentation";
import type { Prisma } from "@gnd/db";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "@gnd/sales/fulfillment-backlog-query";
import {
	compareFulfillmentOrders,
	countFulfillmentOrderSections,
	matchesFulfillmentOrder,
	projectFulfillmentOrderWorkspace,
} from "@gnd/sales/fulfillment-order-workspace";
import { getSalesPipelineSnapshots } from "@gnd/sales/sales-pipeline-order";
import {
	isSalesPipelineFulfillmentCompleted,
	type SalesPipelineSnapshot,
} from "@gnd/sales";

const orderSelect = {
	...fulfillmentBacklogEvidenceSelect,
	completionRecords: {
		...fulfillmentBacklogEvidenceSelect.completionRecords,
		select: {
			...fulfillmentBacklogEvidenceSelect.completionRecords.select,
			effectiveAt: true,
			recordedAt: true,
		},
	},
	orderId: true,
	createdAt: true,
	deliveryDueDate: true,
	deliveryOption: true,
	grandTotal: true,
	amountDue: true,
	customer: { select: { name: true, businessName: true, phoneNo: true } },
	shippingAddress: {
		select: { address1: true, city: true, state: true, phoneNo: true },
	},
	deliveries: {
		...fulfillmentBacklogEvidenceSelect.deliveries,
		select: {
			...fulfillmentBacklogEvidenceSelect.deliveries.select,
			deliveredAt: true,
			driverId: true,
			driver: { select: { name: true } },
			dueDate: true,
			deliveryMode: true,
			exceptions: {
				where: { status: "open", deletedAt: null },
				select: { id: true },
			},
		},
	},
} satisfies Prisma.SalesOrdersSelect;

/** Starts from orders so child filtering can never duplicate a parent across pages. */
export async function getFulfillmentOrders(
	ctx: TRPCContext,
	input: DispatchWorkspaceListInput,
	scope?: { salesId: number },
) {
	const where: Prisma.SalesOrdersWhereInput = {
		type: "order",
		deletedAt: null,
		...(scope ? { id: scope.salesId } : {}),
		...(input.q
			? {
					OR: [
						{ orderId: { contains: input.q } },
						{ customer: { name: { contains: input.q } } },
						{ customer: { businessName: { contains: input.q } } },
						{ customer: { phoneNo: { contains: input.q } } },
						{ shippingAddress: { address1: { contains: input.q } } },
						{
							deliveries: {
								some: {
									deletedAt: null,
									driver: { name: { contains: input.q } },
								},
							},
						},
					],
				}
			: {}),
	};
	const clock = {
		now: new Date(),
		timeZone:
			process.env.BUSINESS_TIME_ZONE || process.env.TZ || "America/New_York",
	};
	const size = Math.max(1, Math.min(100, Number(input.size || 20)));
	const offset = Math.max(0, Number(input.cursor || 0));
	const counts = {
		all: 0,
		active: 0,
		backlog: 0,
		completed: 0,
		dueToday: 0,
		pastDue: 0,
	};
	const byStage = { readyToAssign: 0, readyToLoad: 0, inTransit: 0 };
	const stageCodes = {
		readyToAssign: "ready_to_assign",
		readyToLoad: "ready_to_load",
		inTransit: "in_transit",
	} as const;
	type Row = {
		id: number;
		orderNo: string;
		createdAt: Date | null;
		deliveredAt: Date | null;
		customerName: string;
		phone: string | null;
		destination: string;
		grandTotal: number | null;
		amountDue: number | null;
		lifecycle: string;
		pipeline: SalesPipelineSnapshot;
		workspace: ReturnType<typeof projectFulfillmentOrderWorkspace>;
	};
	const matches: Row[] = [];
	let matchCount = 0;
	let afterId = 0;
	for (;;) {
		const orders = await ctx.db.salesOrders.findMany({
			where: { AND: [where, { id: { gt: afterId } }] },
			orderBy: { id: "asc" },
			take: 100,
			select: orderSelect,
		});
		const pipelines = await getSalesPipelineSnapshots(
			ctx.db,
			orders.map((order) => order.id),
		);
		for (const order of orders) {
			const pipeline = pipelines.get(order.id);
			if (pipeline?.fulfillment.applicability !== "required") continue;
			const workspace = projectFulfillmentOrderWorkspace(
				{
					id: order.id,
					completed: isSalesPipelineFulfillmentCompleted(
						pipeline.fulfillment.state,
					),
					dueDate: order.deliveryDueDate,
					deliveryMode: order.deliveryOption,
					quantities: projectBacklogEvidence(order).projection,
					fulfillments: order.deliveries.map((delivery) => ({
						id: delivery.id,
						status: delivery.status,
						meta: delivery.meta,
						driverId: delivery.driverId,
						driverName: delivery.driver?.name ?? null,
						dueDate: delivery.dueDate,
						deliveryMode: delivery.deliveryMode,
						itemCount: delivery.items.filter(
							(item) => item.packingStatus === "packed",
						).length,
						stockAllocationCount: delivery._count.stockAllocations,
						hasOpenException: delivery.exceptions.length > 0,
						plannedQty: (() => {
							const scope = readFulfillmentAssignmentScope(delivery.meta);
							return scope.state === "resolved"
								? scope.scope.lines.reduce(
										(sum, line) =>
											sum +
											line.quantity.qty +
											line.quantity.lh +
											line.quantity.rh,
										0,
									)
								: null;
						})(),
						packedQty: delivery.items
							.filter((item) => item.packingStatus === "packed")
							.reduce(
								(sum, item) =>
									sum +
									((item.lhQty || 0) + (item.rhQty || 0) || item.qty || 0),
								0,
							),
					})),
				},
				clock,
			);
			const sectionCounts = countFulfillmentOrderSections([workspace], input);
			for (const key of Object.keys(counts) as Array<keyof typeof counts>)
				counts[key] += sectionCounts[key];
			for (const key of Object.keys(byStage) as Array<keyof typeof byStage>) {
				const stage = stageCodes[key];
				if (
					(!input.stages?.length || input.stages.includes(stage)) &&
					matchesFulfillmentOrder(workspace, {
						...input,
						section: undefined,
						stages: [stage],
					})
				)
					byStage[key]++;
			}
			if (!matchesFulfillmentOrder(workspace, input)) continue;
			matchCount++;
			matches.push({
				id: order.id,
				orderNo: order.orderId || String(order.id),
				createdAt: order.createdAt,
				deliveredAt: workspace.completed
					? ([
							...order.completionRecords.map(
								(record) => record.effectiveAt ?? record.recordedAt,
							),
							...order.deliveries
								.filter((delivery) =>
									workspace.fulfillments.some(
										(child) =>
											child.id === delivery.id && child.stage === "fulfilled",
									),
								)
								.map((delivery) => delivery.deliveredAt),
						]
							.filter((date): date is Date => date !== null)
							.sort((a, b) => b.getTime() - a.getTime())[0] ?? null)
					: null,
				customerName:
					order.customer?.businessName ||
					order.customer?.name ||
					"Unknown customer",
				phone:
					order.customer?.phoneNo || order.shippingAddress?.phoneNo || null,
				destination: [
					order.shippingAddress?.address1,
					order.shippingAddress?.city,
					order.shippingAddress?.state,
				]
					.filter(Boolean)
					.join(", "),
				grandTotal: order.grandTotal,
				amountDue: order.amountDue,
				lifecycle: pipeline.fulfillment.state,
				pipeline,
				workspace,
			});
		}
		// Keep only the requested prefix while scanning evidence, not every order's detail.
		matches.sort((a, b) => compareFulfillmentOrders(a, b, input.sort));
		matches.splice(offset + size);
		if (orders.length < 100) break;
		afterId = orders[orders.length - 1]!.id;
	}
	const page = matches.slice(offset, offset + size);
	const presentations = page.length
		? await ctx.db.salesOrders.findMany({
				where: { id: { in: page.map((order) => order.id) }, deletedAt: null },
				select: {
					...dispatchOrderPresentationSelect,
					itemControls: {
						where: { deletedAt: null },
						select: {
							uid: true,
							title: true,
							subtitle: true,
							item: { select: { description: true } },
						},
					},
					id: true,
					orderId: true,
					customer: {
						select: {
							id: true,
							name: true,
							businessName: true,
							phoneNo: true,
							email: true,
						},
					},
				},
			})
		: [];
	const presentationById = new Map(
		presentations.map((order) => [order.id, order]),
	);
	return {
		data: page.map((row) => {
			const order = presentationById.get(row.id);
			const labels = new Map(
				order?.itemControls.map((item) => [item.uid, item]) || [],
			);
			return {
				...row,
				workspace: {
					...row.workspace,
					quantities: {
						...row.workspace.quantities,
						lines: row.workspace.quantities.lines.map((line) => {
							const label = labels.get(line.uid);
							return {
								...line,
								title: label?.title || label?.item?.description || line.title,
								size: line.size || label?.subtitle || null,
							};
						}),
					},
				},
				invoice: order
					? {
							...projectDispatchOrderPresentation(order, null, null, {
								pipeline: row.pipeline,
							}),
							id: order.id,
						}
					: null,
			};
		}),
		counts,
		byStage,
		meta: {
			count: matchCount,
			size,
			cursor: offset + size < matchCount ? String(offset + size) : null,
		},
	};
}

export async function getFulfillmentOrder(
	ctx: TRPCContext,
	input: { salesId: number; cursor: number },
) {
	const result = await getFulfillmentOrders(
		ctx,
		{ section: "dispatches", size: 1 },
		{ salesId: input.salesId },
	);
	const order = result.data[0];
	if (!order) return null;
	const fulfillments = [...order.workspace.fulfillments].sort(
		(a, b) => b.id - a.id,
	);
	return {
		...order,
		workspace: {
			...order.workspace,
			fulfillments: fulfillments.slice(input.cursor, input.cursor + 20),
		},
		fulfillmentCount: fulfillments.length,
		openExceptionFulfillmentCount: fulfillments.filter((fulfillment) =>
			fulfillment.risks.includes("open_exception"),
		).length,
		nextCursor:
			input.cursor + 20 < fulfillments.length ? input.cursor + 20 : null,
	};
}

export async function getFulfillmentCompletionReview(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const paired = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (!paired) return null;
	const manifestRevision = await getDispatchPackingCommandRevision(
		ctx.db,
		paired.id,
	);
	const order = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: fulfillmentBacklogEvidenceSelect,
	});
	const fulfillment = order?.deliveries.find(
		(item) => item.id === input.fulfillmentId,
	);
	if (!order || !fulfillment) return null;
	const orderProjection = projectBacklogEvidence(order).projection;
	const orderLines = new Map(
		orderProjection.lines.map((line) => [line.uid, line]),
	);
	const physical = projectBacklogEvidence({
		...order,
		deliveries: [fulfillment],
	}).projection;
	const review = buildFulfillmentCompletionReview({
		meta: fulfillment.meta,
		packed: physical.lines
			.filter((line) => line.packed.qty + line.packed.lh + line.packed.rh > 0)
			.map((line) => ({ uid: line.uid, quantity: line.packed })),
	});
	const currentRevision = await getDispatchPackingCommandRevision(
		ctx.db,
		paired.id,
	);
	const changed = manifestRevision !== currentRevision;
	const terminal = ["completed", "delivered", "cancelled", "canceled"].includes(
		(fulfillment.status || "").trim().toLowerCase(),
	);
	const blockedReason = changed
		? "Fulfillment changed while loading. Refresh before reviewing."
		: terminal
			? "This fulfillment is already completed or cancelled."
			: physical.resolved && orderProjection.resolved
				? review.blockedReason
				: "Review order and physical packing quantities before completing.";
	return {
		...review,
		deliveryMode: fulfillment.deliveryMode,
		manifestRevision,
		blockedReason,
		lines: !blockedReason
			? review.lines.map((line) => ({
					...line,
					title:
						physical.lines.find((item) => item.uid === line.uid)?.title ||
						line.uid,
					ordered: orderLines.get(line.uid)?.ordered,
					previouslyDelivered: orderLines.get(line.uid)?.delivered,
					remainingToDeliver: orderLines.get(line.uid)?.remainingToDeliver,
				}))
			: [],
	};
}

export async function getFulfillmentDetail(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const record = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: { id: true, meta: true, createdAt: true, deliveredAt: true },
	});
	if (!record) return null;
	const result = await getFulfillmentOrders(
		ctx,
		{ section: "dispatches", size: 1 },
		{ salesId: input.salesId },
	);
	const order = result.data[0];
	const fulfillment = order?.workspace.fulfillments.find(
		(item) => item.id === record.id,
	);
	if (!order || !fulfillment) return null;
	const scope = readFulfillmentAssignmentScope(record.meta);
	const lines = new Map(
		order.workspace.quantities.lines.map((line) => [line.uid, line]),
	);
	return {
		order: {
			id: order.id,
			orderNo: order.orderNo,
			customerName: order.customerName,
			destination: order.destination,
		},
		fulfillment: {
			...fulfillment,
			createdAt: record.createdAt,
			deliveredAt: record.deliveredAt,
		},
		scopeState: scope.state,
		scopeRevision: scope.scope?.revision ?? null,
		items:
			scope.scope?.lines.map((line) => ({
				...line,
				title: lines.get(line.uid)?.title || line.uid,
				size: lines.get(line.uid)?.size ?? null,
			})) ?? [],
	};
}

/** Fetch a bounded exception page only after validating the parent-child pair. */
export async function getFulfillmentExceptions(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number; cursor?: number },
) {
	const fulfillment = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (!fulfillment) return null;
	const rows = await ctx.db.dispatchException.findMany({
		where: {
			orderDeliveryId: fulfillment.id,
			deletedAt: null,
			...(input.cursor ? { id: { lt: input.cursor } } : {}),
		},
		select: {
			id: true,
			reasonCode: true,
			notes: true,
			status: true,
			reportedAt: true,
			resolvedAt: true,
			resolutionNote: true,
		},
		orderBy: { id: "desc" },
		take: 21,
	});
	const data = rows.slice(0, 20);
	return { data, nextCursor: rows.length > 20 ? data.at(-1)!.id : null };
}

/** Return proof registration evidence, without leaking raw storage paths or request keys. */
export async function getFulfillmentProof(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const fulfillment = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: { meta: true, deliveredAt: true },
	});
	if (!fulfillment) return null;
	const proof = getDispatchCompletionProof(fulfillment.meta);
	if (!proof) return { proof: null, documents: [] };
	const ids = [
		proof.signatureDocumentId,
		...proof.attachments.map((item) => item.documentId),
	].filter((id): id is string => Boolean(id));
	const documents = ids.length
		? await ctx.db.storedDocument.findMany({
				where: {
					id: { in: ids },
					ownerType: "dispatch",
					ownerId: String(input.fulfillmentId),
					deletedAt: null,
					status: "ready",
				},
				select: {
					id: true,
					kind: true,
					filename: true,
					mimeType: true,
					createdAt: true,
				},
			})
		: [];
	return {
		proof: {
			status: proof.status,
			startedAt: proof.startedAt,
			completedAt: proof.completedAt ?? null,
			signatureRegistered: documents.some(
				(document) => document.id === proof.signatureDocumentId,
			),
			photoCount: proof.attachments.length,
		},
		documents,
	};
}

export async function getFulfillmentRoute(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const fulfillment = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: {
			meta: true,
			deliveryMode: true,
			order: { select: { shippingAddress: true } },
		},
	});
	if (!fulfillment) return null;
	return {
		deliveryMode: fulfillment.deliveryMode,
		destination: resolveDriverRouteDestination({
			primaryAddress: fulfillment.order.shippingAddress,
			deliveryMeta: fulfillment.meta,
			deliveryMode: fulfillment.deliveryMode,
		}),
	};
}

/** Order-level notes are excluded unless their structured payload identifies this fulfillment. */
export async function getFulfillmentActivity(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number; cursor?: number },
) {
	const fulfillment = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: { createdAt: true, createdBy: { select: { name: true } } },
	});
	if (!fulfillment) return null;
	const rows = await ctx.db.salesHistory.findMany({
		where: {
			salesId: input.salesId,
			deletedAt: null,
			data: { path: "$.dispatchId", equals: input.fulfillmentId },
		},
		select: {
			id: true,
			name: true,
			authorName: true,
			createdAt: true,
			data: true,
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		skip: input.cursor ?? 0,
		take: 21,
	});
	return {
		createdAt: fulfillment.createdAt,
		createdBy: fulfillment.createdBy?.name ?? null,
		data: rows.slice(0, 20).map(({ data, ...row }) => {
			const payload =
				data && typeof data === "object" && !Array.isArray(data) ? data : {};
			return {
				...row,
				sourceDate:
					typeof payload.sourceDate === "string" ? payload.sourceDate : null,
				targetDate:
					typeof payload.targetDate === "string" ? payload.targetDate : null,
			};
		}),
		nextCursor: rows.length > 20 ? (input.cursor ?? 0) + 20 : null,
	};
}

/** Form defaults and create-command revision derive from the same canonical evidence. */
export async function getFulfillmentAssignmentOptions(
	ctx: TRPCContext,
	input: { salesId: number },
) {
	const order = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null, type: "order" },
		select: {
			...fulfillmentBacklogEvidenceSelect,
			itemControls: {
				...fulfillmentBacklogEvidenceSelect.itemControls,
				select: {
					...fulfillmentBacklogEvidenceSelect.itemControls.select,
					subtitle: true,
					item: { select: { description: true } },
				},
			},
			orderId: true,
			deliveryDueDate: true,
			deliveryOption: true,
			status: true,
		},
	});
	if (!order) return null;
	const { projection } = projectBacklogEvidence(order);
	const availableQty = projection.lines.reduce(
		(sum, line) =>
			sum +
			line.availableToAssign.qty +
			line.availableToAssign.lh +
			line.availableToAssign.rh,
		0,
	);
	const canAssign = projection.resolved && availableQty > 0;
	const closed =
		["cancelled", "canceled"].includes(String(order.status).toLowerCase()) ||
		order.completionRecords.length > 0;
	return {
		salesId: order.id,
		orderNo: order.orderId,
		dueDate: order.deliveryDueDate,
		deliveryMode:
			order.deliveryOption === "pickup"
				? ("pickup" as const)
				: ("delivery" as const),
		revision: fulfillmentAssignmentRevision({
			salesId: order.id,
			projection,
			fulfillments: order.deliveries,
		}),
		canAssign: !closed && canAssign,
		blockedReason: closed
			? "This order is closed for new fulfillments."
			: !projection.resolved
				? "Review existing fulfillment quantities before assigning this order."
				: !canAssign
					? "No confirmed remaining quantities are available to assign."
					: null,
		backlogQty: projection.backlogQty,
		availableQty,
		lines: projection.lines
			.filter(
				(line) =>
					line.availableToAssign.qty +
						line.availableToAssign.lh +
						line.availableToAssign.rh >
					0,
			)
			.map((line) => ({
				uid: line.uid,
				title:
					line.title ||
					order.itemControls.find((item) => item.uid === line.uid)?.item
						?.description ||
					line.uid,
				size:
					line.size ||
					order.itemControls.find((item) => item.uid === line.uid)?.subtitle ||
					null,
				quantity: line.availableToAssign,
			})),
	};
}

/** Prefill persisted scope; this view is not permission to execute an edit. */
export async function getFulfillmentEditOptions(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const current = await ctx.db.orderDelivery.findFirst({
		where: {
			id: input.fulfillmentId,
			salesOrderId: input.salesId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			driverId: true,
			dueDate: true,
			deliveryMode: true,
			meta: true,
		},
	});
	if (!current) return null;
	const order = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: {
			...fulfillmentBacklogEvidenceSelect,
			orderId: true,
			status: true,
			itemControls: {
				...fulfillmentBacklogEvidenceSelect.itemControls,
				select: {
					...fulfillmentBacklogEvidenceSelect.itemControls.select,
					subtitle: true,
					item: { select: { description: true } },
				},
			},
		},
	});
	if (!order) return null;
	const scope = readFulfillmentAssignmentScope(current.meta);
	const original = projectBacklogEvidence(order).projection;
	const editable = projectBacklogEvidence(order, {
		excludeDeliveryId: current.id,
	}).projection;
	const preTrip = [
		"queue",
		"packing",
		"packing queue",
		"missing items",
		"packed",
	].includes(String(current.status).toLowerCase());
	const closed =
		order.completionRecords.length > 0 ||
		["cancelled", "canceled"].includes(String(order.status).toLowerCase());
	const controls = new Map(order.itemControls.map((item) => [item.uid, item]));
	return {
		salesId: order.id,
		fulfillmentId: current.id,
		orderNo: order.orderId,
		driverId: current.driverId,
		dueDate: current.dueDate,
		deliveryMode: current.deliveryMode,
		scope: scope.scope,
		revision: fulfillmentAssignmentRevision({
			salesId: order.id,
			projection: original,
			fulfillments: order.deliveries,
		}),
		canEdit:
			preTrip && editable.resolved && scope.state === "resolved" && !closed,
		blockedReason: !preTrip
			? "This fulfillment is in progress or closed and cannot be edited."
			: !editable.resolved || scope.state !== "resolved"
				? "Review fulfillment quantities before editing."
				: closed
					? "This order is closed for fulfillment edits."
					: null,
		lines: editable.lines.map((line) => ({
			uid: line.uid,
			title:
				line.title || controls.get(line.uid)?.item?.description || line.uid,
			size: line.size || controls.get(line.uid)?.subtitle || null,
			capacity: line.availableToAssign,
			quantity: scope.scope?.lines.find((item) => item.uid === line.uid)
				?.quantity ?? { qty: 0, lh: 0, rh: 0 },
		})),
	};
}

export async function getFulfillmentShortLoadPreview(
	ctx: TRPCContext,
	input: { salesId: number; fulfillmentId: number },
) {
	const options = await getFulfillmentEditOptions(ctx, input);
	if (!options) return null;
	const order = await ctx.db.salesOrders.findFirst({
		where: { id: input.salesId, deletedAt: null },
		select: fulfillmentBacklogEvidenceSelect,
	});
	const delivery = order?.deliveries.find(
		(item) => item.id === input.fulfillmentId,
	);
	if (!order || !delivery) return null;
	const projection = projectBacklogEvidence(order).projection;
	const revision = fulfillmentAssignmentRevision({
		salesId: order.id,
		projection,
		fulfillments: order.deliveries,
	});
	const pendingReports = await ctx.db.salesPackingReport.count({
		where: {
			salesOrderId: input.salesId,
			orderDeliveryId: input.fulfillmentId,
			status: "PENDING",
		},
	});
	const activeAllocations = await ctx.db.stockAllocation.count({
		where: {
			orderDeliveryId: input.fulfillmentId,
			deletedAt: null,
			status: { notIn: ["released", "cancelled"] },
		},
	});
	let inventory: Awaited<
		ReturnType<typeof getShortLoadInventoryContext>
	> | null = null;
	let inventoryError: string | null = null;
	if (activeAllocations > 0) {
		try {
			inventory = await getShortLoadInventoryContext(ctx.db, input);
		} catch (error) {
			inventoryError =
				error instanceof Error
					? error.message
					: "Review inventory allocations.";
		}
	}
	const inventoryPreview = {
		inventoryRevision: inventory?.revision ?? null,
		requiresPhysicalReturn: inventory?.requiresPhysicalReturn ?? false,
		inventoryReleases: inventory?.releases ?? [],
	};
	const blockedReason = !options.canEdit
		? options.blockedReason
		: revision !== options.revision
			? "Fulfillment changed. Refresh before reviewing."
			: inventoryError
				? inventoryError
				: pendingReports > 0 ||
						delivery.items.some(
							(item) =>
								item.packingStatus !== "packed" &&
								item.packingStatus !== "unpacked" &&
								Number(item.qty || 0) +
									Number(item.lhQty || 0) +
									Number(item.rhQty || 0) >
									0,
						)
					? "Resolve pending packing before confirming the short load."
					: null;
	if (blockedReason || !options.scope)
		return {
			...inventoryPreview,
			salesId: input.salesId,
			fulfillmentId: input.fulfillmentId,
			revision,
			canConfirm: false,
			blockedReason: blockedReason || "Review fulfillment quantities.",
			releasedQty: 0,
			lines: [],
		};
	const physical = projectBacklogEvidence({
		...order,
		deliveries: [delivery],
	}).projection;
	const plan = buildFulfillmentShortLoadPlan({
		meta: delivery.meta,
		expectedScopeRevision: options.scope.revision,
		lines: physical.lines
			.filter((line) => line.packed.qty + line.packed.lh + line.packed.rh > 0)
			.map((line) => ({ uid: line.uid, quantity: line.packed })),
	});
	const labels = new Map(options.lines.map((line) => [line.uid, line]));
	return {
		...inventoryPreview,
		salesId: input.salesId,
		fulfillmentId: input.fulfillmentId,
		revision,
		canConfirm: plan.changed,
		blockedReason: plan.changed
			? null
			: "No short quantities remain to release.",
		releasedQty: plan.releasedQty,
		lines: plan.lines.map((line) => ({
			...line,
			title: labels.get(line.uid)?.title || line.uid,
			size: labels.get(line.uid)?.size ?? null,
		})),
	};
}
