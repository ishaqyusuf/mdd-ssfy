import type { TRPCContext } from "@api/trpc/init";
import { createApiVercelBlobDocumentService } from "@api/utils/documents";
import {
	createStoredDocumentRegistry,
	normalizeStoredDocument,
} from "@api/utils/stored-documents";
import { buildOwnerDocumentFolder } from "@gnd/documents";
import {
	assignInboundDemandsToShipment,
	createInboundShipment,
	createInboundShipmentFromDemands,
	getInboundShipmentDetail,
	listInboundShipments,
} from "@gnd/inventory";
import { Notifications } from "@gnd/notifications";
import { stripSpecialCharacters } from "@gnd/utils";
import { getSubscribersAccount } from "@notifications/channel-subscribers";
import { syncChannels } from "@notifications/channels-query";
import { mergeTagRows } from "@notifications/tag-values";
import { put } from "@vercel/blob";

const INBOUND_OWNER_TYPE = "inventory_inbound_shipment";
const INBOUND_DOCUMENT_KIND = "inbound_receipt";

type UploadableDocument = {
	filename: string;
	contentType?: string | null;
	contentBase64: string;
	size?: number | null;
};

function normalizeInboundDocument(
	document: ReturnType<typeof normalizeStoredDocument>,
) {
	return {
		...document,
		uploadedByName: null as string | null,
	};
}

async function getInboundActor(ctx: TRPCContext) {
	if (!ctx.userId) {
		throw new Error("You must be signed in to perform inbound actions.");
	}
	return ctx.db.users.findFirstOrThrow({
		where: {
			id: ctx.userId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
		},
	});
}

async function createInboundActivity(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		supplierId?: number | null;
		supplierName?: string | null;
		reference?: string | null;
		activityType:
			| "created"
			| "documents_uploaded"
			| "extraction_started"
			| "extraction_completed"
			| "extraction_failed"
			| "extraction_applied"
			| "demands_assigned"
			| "status_updated"
			| "received";
		subject: string;
		headline: string;
		note?: string | null;
		documentIds?: string[];
		orderNos?: string[];
		meta?: Record<string, unknown>;
	},
) {
	await syncChannels(ctx.db).catch(() => null);
	const lifecycleEventId = crypto.randomUUID();
	const authorContact = ctx.userId
		? (
				await getSubscribersAccount(ctx.db, [ctx.userId], {
					role: "employee",
					channelName: "inventory_inbound_activity",
				})
			)?.[0]
		: null;
	const notificationOptions = ctx.userId
		? {
				author: {
					id: ctx.userId,
					role: "employee" as const,
				},
				...(authorContact ? { authorContact } : {}),
				includeChannelSubscribers: true,
				allowFallbackRecipient: false,
			}
		: undefined;

	const notifications = new Notifications(ctx.db);
	await notifications.create(
		"inventory_inbound_activity",
		{
			inboundId: input.inboundId,
			supplierId: input.supplierId ?? null,
			supplierName: input.supplierName ?? null,
			reference: input.reference ?? null,
			lifecycleEventId,
			activityType: input.activityType,
			note: input.note ?? null,
			documentIds: input.documentIds ?? [],
			orderNos: input.orderNos ?? [],
			meta: input.meta ?? {},
		},
		notificationOptions,
	);
}

async function matchExtractionLines(ctx: TRPCContext, extractionId: number) {
	const lines = await ctx.db.inboundShipmentExtractionLine.findMany({
		where: {
			extractionId,
			deletedAt: null,
		},
		select: {
			id: true,
			rawDescription: true,
			rawSku: true,
		},
		orderBy: {
			lineNo: "asc",
		},
	});

	for (const line of lines) {
		const rawSku = String(line.rawSku || "").trim();
		const rawDescription = String(line.rawDescription || "").trim();

		let match:
			| {
					inventoryId: number;
					inventoryCategoryId: number;
					inventoryVariantId: number;
					matchStatus: "matched" | "suggested";
					confidence: number;
			  }
			| undefined;

		if (rawSku) {
			const variant = await ctx.db.inventoryVariant.findFirst({
				where: {
					sku: rawSku,
					deletedAt: null,
					inventory: {
						productKind: "inventory",
						deletedAt: null,
						...({ sourceCustom: false } as any),
					},
				},
				select: {
					id: true,
					inventoryId: true,
					inventory: {
						select: {
							inventoryCategoryId: true,
						},
					},
				},
			});

			if (variant) {
				match = {
					inventoryId: variant.inventoryId,
					inventoryCategoryId: variant.inventory.inventoryCategoryId,
					inventoryVariantId: variant.id,
					matchStatus: "matched",
					confidence: 0.98,
				};
			}
		}

		if (!match && rawDescription) {
			const inventory = await ctx.db.inventory.findFirst({
				where: {
					deletedAt: null,
					productKind: "inventory",
					...({ sourceCustom: false } as any),
					name: {
						contains: rawDescription.split(/\s+/).slice(0, 4).join(" "),
					},
				},
				select: {
					id: true,
					inventoryCategoryId: true,
					name: true,
					variants: {
						where: {
							deletedAt: null,
						},
						orderBy: {
							createdAt: "asc",
						},
						take: 1,
						select: {
							id: true,
							sku: true,
						},
					},
				},
			});

			if (inventory?.variants[0]) {
				match = {
					inventoryId: inventory.id,
					inventoryCategoryId: inventory.inventoryCategoryId,
					inventoryVariantId: inventory.variants[0].id,
					matchStatus: "suggested",
					confidence: 0.62,
				};
			}
		}

		await ctx.db.inboundShipmentExtractionLine.update({
			where: {
				id: line.id,
			},
			data: match
				? {
						inventoryId: match.inventoryId,
						inventoryCategoryId: match.inventoryCategoryId,
						inventoryVariantId: match.inventoryVariantId,
						matchStatus: match.matchStatus,
						confidence: match.confidence,
					}
				: {
						matchStatus: "unresolved",
						confidence: 0,
					},
		});
	}
}

async function callOpenAIInvoiceExtraction(url: string) {
	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		throw new Error("OPENAI_API_KEY is not configured.");
	}

	const model = process.env.OPENAI_INBOUND_EXTRACTION_MODEL || "gpt-4o-mini";
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model,
			response_format: {
				type: "json_object",
			},
			messages: [
				{
					role: "system",
					content:
						"Extract supplier invoice or packing slip data. Return strict JSON with keys supplierName, invoiceNumber, invoiceDate, rawText, lineItems. lineItems must be an array of objects with description, sku, qty, unitPrice.",
				},
				{
					role: "user",
					content: [
						{
							type: "text",
							text: "Extract the receipt/invoice into structured JSON.",
						},
						{
							type: "image_url",
							image_url: {
								url,
							},
						},
					],
				},
			],
		}),
	});

	const json = (await response.json()) as {
		error?: {
			message?: string;
		};
		choices?: Array<{
			message?: {
				content?: string;
			};
		}>;
	};
	if (!response.ok) {
		throw new Error(
			json?.error?.message || "OpenAI extraction request failed.",
		);
	}

	const content = json?.choices?.[0]?.message?.content;
	if (!content) {
		throw new Error("OpenAI extraction returned no content.");
	}

	return {
		model,
		payload: JSON.parse(content) as {
			supplierName?: string;
			invoiceNumber?: string;
			invoiceDate?: string;
			rawText?: string;
			lineItems?: Array<{
				description?: string;
				sku?: string;
				qty?: number;
				unitPrice?: number;
			}>;
		},
	};
}

async function autoAssignOpenDemandsForShipmentItem(
	ctx: TRPCContext,
	input: {
		inboundShipmentItemId: number;
		inventoryVariantId: number;
		qty: number;
	},
) {
	let remainingQty = Math.max(0, Number(input.qty || 0));
	if (remainingQty <= 0) return [];

	const demands = await ctx.db.inboundDemand.findMany({
		where: {
			deletedAt: null,
			inventoryVariantId: input.inventoryVariantId,
			inboundShipmentItemId: null,
			status: {
				in: ["pending", "ordered", "partially_received"],
			},
		},
		orderBy: {
			createdAt: "asc",
		},
		select: {
			id: true,
			qty: true,
			qtyReceived: true,
			lineItemComponent: {
				select: {
					parent: {
						select: {
							sale: {
								select: {
									orderId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const orderNos: string[] = [];
	for (const demand of demands) {
		if (remainingQty <= 0) break;
		const outstanding = Math.max(
			0,
			Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
		);
		if (outstanding <= 0) continue;

		const assignQty = Math.min(outstanding, remainingQty);
		remainingQty -= assignQty;

		await ctx.db.inboundDemand.update({
			where: {
				id: demand.id,
			},
			data: {
				inboundShipmentItemId: input.inboundShipmentItemId,
				status: "ordered",
			},
		});

		const orderNo = demand.lineItemComponent.parent.sale?.orderId;
		if (orderNo) orderNos.push(orderNo);
	}

	return Array.from(new Set(orderNos));
}

export async function listInboundSuppliers(ctx: TRPCContext) {
	return ctx.db.supplier.findMany({
		where: {
			deletedAt: null,
		},
		orderBy: {
			name: "asc",
		},
		select: {
			id: true,
			name: true,
			email: true,
			phone: true,
		},
	});
}

export async function listInboundShipmentsQuery(
	ctx: TRPCContext,
	input: {
		status?: Array<
			| "pending"
			| "in_progress"
			| "completed"
			| "issue_open"
			| "closed"
			| "cancelled"
		>;
		supplierId?: number | null;
	} = {},
) {
	const shipments = await listInboundShipments(ctx.db, input);
	const ids = shipments.map((shipment) => shipment.id);
	const docCounts = ids.length
		? await ctx.db.storedDocument.groupBy({
				by: ["ownerId"],
				where: {
					ownerType: INBOUND_OWNER_TYPE,
					kind: INBOUND_DOCUMENT_KIND,
					deletedAt: null,
					ownerId: {
						in: ids.map(String),
					},
				},
				_count: {
					_all: true,
				},
			})
		: [];

	const docCountByInboundId = new Map(
		docCounts.map((row) => [Number(row.ownerId), row._count._all]),
	);
	const linkedDemandRows = ids.length
		? await ctx.db.inboundDemand.findMany({
				where: {
					deletedAt: null,
					inboundShipmentItem: {
						inboundId: {
							in: ids,
						},
						deletedAt: null,
					},
				},
				select: {
					qty: true,
					qtyReceived: true,
					status: true,
					inboundShipmentItem: {
						select: {
							inboundId: true,
						},
					},
					lineItemComponent: {
						select: {
							parent: {
								select: {
									sale: {
										select: {
											id: true,
											orderId: true,
											slug: true,
											type: true,
											inventoryStatus: true,
											invoiceStatus: true,
											grandTotal: true,
											amountDue: true,
											createdAt: true,
											prodDueDate: true,
											customer: {
												select: {
													id: true,
													name: true,
													businessName: true,
													phoneNo: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			})
		: [];
	const ordersByInboundId = new Map<
		number,
		Map<
			number,
			{
				id: number;
				orderId: string;
				slug: string;
				type: string | null;
				inventoryStatus: string | null;
				invoiceStatus: string | null;
				grandTotal: number | null;
				amountDue: number | null;
				createdAt: Date | null;
				prodDueDate: Date | null;
				customer: {
					id: number;
					name: string | null;
					businessName: string | null;
					phoneNo: string | null;
				} | null;
				qty: number;
				qtyReceived: number;
				demandCount: number;
				statuses: string[];
			}
		>
	>();

	for (const demand of linkedDemandRows) {
		const inboundId = demand.inboundShipmentItem?.inboundId;
		const sale = demand.lineItemComponent.parent.sale;
		if (!inboundId || !sale) continue;

		const orders = ordersByInboundId.get(inboundId) ?? new Map();
		const existing = orders.get(sale.id);
		const qty = Number(demand.qty || 0);
		const qtyReceived = Number(demand.qtyReceived || 0);

		orders.set(sale.id, {
			id: sale.id,
			orderId: sale.orderId,
			slug: sale.slug,
			type: sale.type ?? null,
			inventoryStatus: sale.inventoryStatus ?? null,
			invoiceStatus: sale.invoiceStatus ?? null,
			grandTotal: sale.grandTotal == null ? null : Number(sale.grandTotal),
			amountDue: sale.amountDue == null ? null : Number(sale.amountDue),
			createdAt: sale.createdAt ?? null,
			prodDueDate: sale.prodDueDate ?? null,
			customer: sale.customer
				? {
						id: sale.customer.id,
						name: sale.customer.name ?? null,
						businessName: sale.customer.businessName ?? null,
						phoneNo: sale.customer.phoneNo ?? null,
					}
				: null,
			qty: Number(existing?.qty || 0) + qty,
			qtyReceived: Number(existing?.qtyReceived || 0) + qtyReceived,
			demandCount: Number(existing?.demandCount || 0) + 1,
			statuses: Array.from(
				new Set([...(existing?.statuses || []), demand.status]),
			),
		});
		ordersByInboundId.set(inboundId, orders);
	}

	return shipments.map((shipment) => ({
		...shipment,
		documentCount: docCountByInboundId.get(shipment.id) ?? 0,
		extractionCount: shipment.extractions.length,
		itemCount: shipment.items.length,
		linkedOrders: Array.from(
			ordersByInboundId.get(shipment.id)?.values() ?? [],
		),
	}));
}

export async function listOrderInboundShipmentsQuery(
	ctx: TRPCContext,
	input: {
		salesOrderId: number;
	},
) {
	const rows = await ctx.db.inboundShipment.findMany({
		where: {
			deletedAt: null,
			items: {
				some: {
					deletedAt: null,
					inboundDemands: {
						some: {
							deletedAt: null,
							lineItemComponent: {
								parent: {
									saleId: input.salesOrderId,
								},
							},
						},
					},
				},
			},
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			supplierId: true,
			status: true,
			expectedAt: true,
			receivedAt: true,
			reference: true,
			progress: true,
			createdAt: true,
			supplier: {
				select: {
					id: true,
					name: true,
				},
			},
			items: {
				where: {
					deletedAt: null,
					inboundDemands: {
						some: {
							deletedAt: null,
							lineItemComponent: {
								parent: {
									saleId: input.salesOrderId,
								},
							},
						},
					},
				},
				orderBy: {
					createdAt: "asc",
				},
				select: {
					id: true,
					qty: true,
					unitPrice: true,
					qtyGood: true,
					qtyIssue: true,
					inventoryVariantId: true,
					inventoryVariant: {
						select: {
							id: true,
							uid: true,
							sku: true,
							description: true,
							inventoryId: true,
							inventory: {
								select: {
									id: true,
									name: true,
								},
							},
						},
					},
					inboundDemands: {
						where: {
							deletedAt: null,
							lineItemComponent: {
								parent: {
									saleId: input.salesOrderId,
								},
							},
						},
						orderBy: {
							createdAt: "asc",
						},
						select: {
							id: true,
							qty: true,
							qtyReceived: true,
							status: true,
							lineItemComponentId: true,
							lineItemComponent: {
								select: {
									id: true,
									qty: true,
									status: true,
									inventoryCategory: {
										select: {
											title: true,
										},
									},
									inventory: {
										select: {
											id: true,
											name: true,
										},
									},
									parent: {
										select: {
											id: true,
											title: true,
											description: true,
											saleId: true,
											sale: {
												select: {
													id: true,
													orderId: true,
													slug: true,
												},
											},
										},
									},
								},
							},
						},
					},
				},
			},
		},
	});

	return rows.map((shipment) => {
		const items = shipment.items.map((item) => {
			const demandQty = item.inboundDemands.reduce(
				(total, demand) => total + Number(demand.qty || 0),
				0,
			);
			const receivedQty = item.inboundDemands.reduce(
				(total, demand) => total + Number(demand.qtyReceived || 0),
				0,
			);

			return {
				...item,
				itemName:
					item.inventoryVariant.inventory?.name ||
					item.inventoryVariant.description ||
					item.inventoryVariant.sku ||
					item.inventoryVariant.uid ||
					"Inventory stock",
				demandQty,
				receivedQty,
			};
		});
		const qtyOrdered = items.reduce(
			(total, item) => total + Number(item.demandQty || item.qty || 0),
			0,
		);
		const qtyReceived = items.reduce(
			(total, item) =>
				total +
				Number(item.receivedQty || item.qtyGood || 0) +
				Number(item.qtyIssue || 0),
			0,
		);

		return {
			...shipment,
			items,
			itemCount: items.length,
			demandCount: items.reduce(
				(total, item) => total + item.inboundDemands.length,
				0,
			),
			qtyOrdered,
			qtyReceived,
		};
	});
}

export async function updateInboundShipmentStatusQuery(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		status:
			| "pending"
			| "in_progress"
			| "completed"
			| "issue_open"
			| "closed"
			| "cancelled";
	},
) {
	const actor = await getInboundActor(ctx);
	const previous = await ctx.db.inboundShipment.findFirstOrThrow({
		where: {
			id: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			status: true,
			supplierId: true,
			reference: true,
			supplier: {
				select: {
					name: true,
				},
			},
		},
	});
	const data: {
		status: typeof input.status;
		receivedAt?: Date | null;
		progress?: number;
	} = {
		status: input.status,
	};

	if (input.status === "completed") {
		data.receivedAt = new Date();
		data.progress = 100;
	}
	if (input.status === "pending") {
		data.receivedAt = null;
		data.progress = 0;
	}

	const updated = await ctx.db.inboundShipment.update({
		where: {
			id: input.inboundId,
		},
		data,
		select: {
			id: true,
			status: true,
			progress: true,
			receivedAt: true,
		},
	});

	await createInboundActivity(ctx, {
		inboundId: input.inboundId,
		supplierId: previous.supplierId,
		supplierName: previous.supplier?.name ?? null,
		reference: previous.reference ?? null,
		activityType: "status_updated",
		subject: "Inbound status updated",
		headline: `${actor.name || "Unknown"} updated inbound #${input.inboundId} from ${previous.status} to ${input.status}.`,
		meta: {
			previousStatus: previous.status,
			status: input.status,
		},
	});

	return updated;
}

export async function createInboundShipmentQuery(
	ctx: TRPCContext,
	input: {
		supplierId: number;
		reference?: string | null;
		expectedAt?: Date | null;
	},
) {
	const actor = await getInboundActor(ctx);
	const supplier = await ctx.db.supplier.findFirst({
		where: {
			id: input.supplierId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
		},
	});

	const inbound = await createInboundShipment(ctx.db, input);
	await createInboundActivity(ctx, {
		inboundId: inbound.id,
		supplierId: supplier?.id ?? input.supplierId,
		supplierName: supplier?.name ?? null,
		reference: inbound.reference,
		activityType: "created",
		subject: "Inbound created",
		headline: `${actor.name || "Unknown"} created inbound #${inbound.id}${supplier?.name ? ` for ${supplier.name}` : ""}.`,
	});

	return inbound;
}

export async function createInboundShipmentFromDemandsQuery(
	ctx: TRPCContext,
	input: {
		supplierId: number;
		demandIds?: number[];
		lineItemComponentIds?: number[];
		componentSelections?: Array<{
			lineItemComponentIds: number[];
			qty: number;
		}>;
		reference?: string | null;
		expectedAt?: Date | null;
	},
) {
	const actor = await getInboundActor(ctx);
	const ensuredDemandIds = input.componentSelections?.length
		? await ensureSelectedInboundDemandsForStockComponents(
				ctx,
				input.componentSelections,
			)
		: await ensurePendingInboundDemandsForStockComponents(
				ctx,
				input.lineItemComponentIds || [],
			);
	const demandIds = Array.from(
		new Set([...(input.demandIds || []), ...ensuredDemandIds]),
	);
	const supplier = await ctx.db.supplier.findFirst({
		where: {
			id: input.supplierId,
			deletedAt: null,
		},
		select: {
			id: true,
			name: true,
		},
	});
	const result = await createInboundShipmentFromDemands(ctx.db, {
		supplierId: input.supplierId,
		demandIds,
		reference: input.reference,
		expectedAt: input.expectedAt,
	});
	const inbound = await ctx.db.inboundShipment.findFirst({
		where: {
			id: result.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			reference: true,
		},
	});
	const orderNos = await ctx.db.inboundDemand.findMany({
		where: {
			id: {
				in: demandIds,
			},
		},
		select: {
			lineItemComponent: {
				select: {
					parent: {
						select: {
							sale: {
								select: {
									orderId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	await createInboundActivity(ctx, {
		inboundId: result.inboundId,
		supplierId: supplier?.id ?? input.supplierId,
		supplierName: supplier?.name ?? null,
		reference: inbound?.reference ?? input.reference ?? null,
		activityType: "created",
		subject: "Inbound created from demand",
		headline: `${actor.name || "Unknown"} created inbound #${result.inboundId} from ${result.linkedDemandCount} demand row${result.linkedDemandCount === 1 ? "" : "s"}${supplier?.name ? ` for ${supplier.name}` : ""}.`,
		orderNos: orderNos
			.map((row) => row.lineItemComponent.parent.sale?.orderId)
			.filter((value): value is string => Boolean(value)),
		meta: {
			createdItemCount: result.createdItemCount,
			linkedDemandCount: result.linkedDemandCount,
		},
	});

	return result;
}

async function ensurePendingInboundDemandsForStockComponents(
	ctx: TRPCContext,
	lineItemComponentIds: number[],
) {
	return ensureSelectedInboundDemandsForStockComponents(
		ctx,
		Array.from(
			new Set(lineItemComponentIds.filter((id) => Number.isFinite(id))),
		).map((id) => ({
			lineItemComponentIds: [id],
			qty: Number.POSITIVE_INFINITY,
		})),
	);
}

async function ensureSelectedInboundDemandsForStockComponents(
	ctx: TRPCContext,
	selections: Array<{
		lineItemComponentIds: number[];
		qty: number;
	}>,
) {
	const normalizedSelections = selections
		.map((selection) => ({
			lineItemComponentIds: Array.from(
				new Set(
					(selection.lineItemComponentIds || []).filter((id) =>
						Number.isFinite(id),
					),
				),
			),
			qty: Math.max(0, Number(selection.qty || 0)),
		}))
		.filter((selection) => selection.lineItemComponentIds.length);
	const componentIds = Array.from(
		new Set(
			normalizedSelections.flatMap(
				(selection) => selection.lineItemComponentIds,
			),
		),
	);
	if (!componentIds.length) return [];

	const components = await ctx.db.lineItemComponents.findMany({
		where: {
			id: {
				in: componentIds,
			},
			inventoryId: {
				not: null,
			},
			inventoryVariantId: {
				not: null,
			},
			parent: {
				deletedAt: null,
			},
		},
		select: {
			id: true,
			qty: true,
			qtyAllocated: true,
			qtyReceived: true,
			status: true,
			inventoryVariantId: true,
			inventory: {
				select: {
					productKind: true,
					stockMode: true,
				},
			},
			inventoryCategory: {
				select: {
					productKind: true,
					stockMode: true,
				},
			},
			inboundDemands: {
				where: {
					deletedAt: null,
					status: {
						in: ["pending", "ordered", "partially_received"],
					},
				},
				select: {
					id: true,
					qty: true,
					qtyReceived: true,
					status: true,
					inboundShipmentItemId: true,
				},
				orderBy: {
					createdAt: "asc",
				},
			},
		},
	});
	const componentsById = new Map(
		components.map((component) => [component.id, component]),
	);

	const demandIds: number[] = [];

	for (const selection of normalizedSelections) {
		let remainingSelectionQty = selection.qty;
		if (remainingSelectionQty <= 0) continue;

		for (const componentId of selection.lineItemComponentIds) {
			if (remainingSelectionQty <= 0) break;
			const component = componentsById.get(componentId);
			if (!component) continue;

			const productKind =
				component.inventoryCategory?.productKind ||
				component.inventory?.productKind ||
				null;
			const stockMode =
				component.inventoryCategory?.stockMode ||
				component.inventory?.stockMode ||
				null;
			const inventoryVariantId = component.inventoryVariantId;

			if (!inventoryVariantId) continue;
			if (productKind === "component") continue;
			if (stockMode !== "monitored") continue;

			const reservedDemandQty = component.inboundDemands.reduce(
				(total, demand) => {
					const outstanding = Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					);
					const isReusablePendingDemand =
						demand.status === "pending" && !demand.inboundShipmentItemId;
					return isReusablePendingDemand ? total : total + outstanding;
				},
				0,
			);
			const requiredQty = Math.max(0, Number(component.qty || 0));
			const requestableQty = Math.max(
				0,
				requiredQty -
					Math.max(0, Number(component.qtyAllocated || 0)) -
					Math.max(0, Number(component.qtyReceived || 0)) -
					reservedDemandQty,
			);
			let remainingComponentQty = Math.min(
				remainingSelectionQty,
				requestableQty,
			);
			let activeDemandQty = component.inboundDemands.reduce(
				(total, demand) =>
					total +
					Math.max(
						0,
						Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
					),
				0,
			);

			if (remainingComponentQty <= 0) continue;

			for (const demand of component.inboundDemands) {
				if (remainingComponentQty <= 0) break;
				const outstanding = Math.max(
					0,
					Number(demand.qty || 0) - Number(demand.qtyReceived || 0),
				);
				if (
					outstanding > 0 &&
					demand.status === "pending" &&
					!demand.inboundShipmentItemId
				) {
					const takeQty = Math.min(remainingComponentQty, outstanding);
					if (takeQty >= outstanding || Number(demand.qtyReceived || 0) > 0) {
						demandIds.push(demand.id);
					} else {
						const splitDemand = await ctx.db.inboundDemand.create({
							data: {
								lineItemComponentId: component.id,
								inventoryVariantId,
								qty: takeQty,
								status: "pending",
							},
							select: {
								id: true,
							},
						});
						await ctx.db.inboundDemand.update({
							where: {
								id: demand.id,
							},
							data: {
								qty: outstanding - takeQty,
							},
						});
						demandIds.push(splitDemand.id);
					}
					remainingComponentQty -= takeQty;
					remainingSelectionQty -= takeQty;
				}
			}

			if (remainingComponentQty > 0) {
				const demand = await ctx.db.inboundDemand.create({
					data: {
						lineItemComponentId: component.id,
						inventoryVariantId,
						qty: remainingComponentQty,
						status: "pending",
					},
					select: {
						id: true,
					},
				});
				demandIds.push(demand.id);
				activeDemandQty += remainingComponentQty;
				remainingSelectionQty -= remainingComponentQty;
			}

			if (activeDemandQty > 0) {
				await ctx.db.lineItemComponents.update({
					where: {
						id: component.id,
					},
					data: {
						qtyInbound: activeDemandQty,
						status:
							component.status === "allocated"
								? "allocated"
								: "inbound_required",
					},
				});
			}
		}
	}

	return demandIds;
}

export async function assignInboundDemandsQuery(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		demandIds: number[];
	},
) {
	const actor = await getInboundActor(ctx);
	const result = await assignInboundDemandsToShipment(ctx.db, input);
	const inbound = await ctx.db.inboundShipment.findFirst({
		where: {
			id: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			reference: true,
			supplier: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	const orderNos = await ctx.db.inboundDemand.findMany({
		where: {
			id: {
				in: input.demandIds,
			},
		},
		select: {
			lineItemComponent: {
				select: {
					parent: {
						select: {
							sale: {
								select: {
									orderId: true,
								},
							},
						},
					},
				},
			},
		},
	});

	await createInboundActivity(ctx, {
		inboundId: input.inboundId,
		supplierId: inbound?.supplier?.id ?? null,
		supplierName: inbound?.supplier?.name ?? null,
		reference: inbound?.reference ?? null,
		activityType: "demands_assigned",
		subject: "Inbound demands assigned",
		headline: `${actor.name || "Unknown"} assigned ${result.linkedDemandCount} demand row${result.linkedDemandCount === 1 ? "" : "s"} to inbound #${input.inboundId}.`,
		orderNos: orderNos
			.map((row) => row.lineItemComponent.parent.sale?.orderId)
			.filter((value): value is string => Boolean(value)),
	});

	return result;
}

export async function uploadInboundDocumentsQuery(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		files: UploadableDocument[];
		note?: string | null;
	},
) {
	const actor = await getInboundActor(ctx);
	const inbound = await ctx.db.inboundShipment.findFirstOrThrow({
		where: {
			id: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			reference: true,
			supplier: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	const ownerType = INBOUND_OWNER_TYPE;
	const ownerId = String(inbound.id);
	const kind = INBOUND_DOCUMENT_KIND;
	const folder = buildOwnerDocumentFolder({
		ownerType,
		ownerId,
		kind,
	});

	const documentService = createApiVercelBlobDocumentService({
		put: (pathname, body, options) =>
			put(pathname, body as any, {
				access: "public",
				contentType: options?.contentType,
				token: options?.token,
				addRandomSuffix: options?.addRandomSuffix,
				cacheControlMaxAge: options?.cacheControlMaxAge,
			}),
	});
	const registry = createStoredDocumentRegistry(ctx.db);

	const uploadedFiles = await documentService.uploadMany(
		input.files.map((file) => ({
			filename: stripSpecialCharacters(file.filename) || file.filename,
			folder,
			contentType: file.contentType || undefined,
			body: Buffer.from(file.contentBase64, "base64"),
		})),
	);

	const createdDocuments = await Promise.all(
		uploadedFiles.map((upload, index) =>
			registry.registerUploaded({
				ownerType,
				ownerId,
				kind,
				upload,
				uploadedBy: ctx.userId,
				isCurrent: false,
				visibility: "public",
				title: input.files[index]?.filename || upload.filename || null,
				description: input.note?.trim() || null,
				meta: {
					inboundId: inbound.id,
					supplierName: inbound.supplier.name,
					uploadedAt: new Date().toISOString(),
					originalContentType: input.files[index]?.contentType || null,
					originalSize: input.files[index]?.size ?? null,
				},
			}),
		),
	);

	await createInboundActivity(ctx, {
		inboundId: inbound.id,
		supplierId: inbound.supplier.id,
		supplierName: inbound.supplier.name,
		reference: inbound.reference ?? null,
		activityType: "documents_uploaded",
		subject: "Inbound receipt uploaded",
		headline: `${actor.name || "Unknown"} uploaded ${createdDocuments.length} inbound document${createdDocuments.length === 1 ? "" : "s"} to inbound #${inbound.id}.`,
		note: input.note ?? null,
		documentIds: createdDocuments.map((document) => document.id),
	});

	return {
		documents: createdDocuments.map((document) => ({
			...normalizeStoredDocument(document),
			...{},
			uploadedByName: actor.name || "Unknown",
		})),
	};
}

export async function listInboundDocumentsQuery(
	ctx: TRPCContext,
	inboundId: number,
) {
	const documents = await ctx.db.storedDocument.findMany({
		where: {
			ownerType: INBOUND_OWNER_TYPE,
			ownerId: String(inboundId),
			kind: INBOUND_DOCUMENT_KIND,
			deletedAt: null,
			status: "ready",
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	const uploaderIds = Array.from(
		new Set(
			documents
				.map((document) => document.uploadedBy)
				.filter((value): value is number => Number.isInteger(value)),
		),
	);
	const uploaders = uploaderIds.length
		? await ctx.db.users.findMany({
				where: {
					id: {
						in: uploaderIds,
					},
					deletedAt: null,
				},
				select: {
					id: true,
					name: true,
				},
			})
		: [];

	const uploaderMap = new Map(
		uploaders.map((uploader) => [uploader.id, uploader.name]),
	);

	return documents.map((document) => ({
		...normalizeStoredDocument(document as any),
		uploadedByName:
			(document.uploadedBy ? uploaderMap.get(document.uploadedBy) : null) ||
			null,
	}));
}

export async function extractInboundDocumentsQuery(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		documentId?: string | null;
		force?: boolean;
	},
) {
	const actor = await getInboundActor(ctx);
	const inbound = await ctx.db.inboundShipment.findFirstOrThrow({
		where: {
			id: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			reference: true,
			supplier: {
				select: {
					id: true,
					name: true,
				},
			},
		},
	});

	const documents = await ctx.db.storedDocument.findMany({
		where: {
			ownerType: INBOUND_OWNER_TYPE,
			ownerId: String(input.inboundId),
			kind: INBOUND_DOCUMENT_KIND,
			deletedAt: null,
			status: "ready",
			...(input.documentId ? { id: input.documentId } : {}),
		},
		orderBy: {
			createdAt: "desc",
		},
	});

	const results: Array<{ id: number; status: string }> = [];
	for (const document of documents) {
		const existing = await ctx.db.inboundShipmentExtraction.findFirst({
			where: {
				inboundId: input.inboundId,
				storedDocumentId: document.id,
				deletedAt: null,
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				status: true,
			},
		});

		if (existing && !input.force) {
			results.push(existing);
			continue;
		}

		await createInboundActivity(ctx, {
			inboundId: inbound.id,
			supplierId: inbound.supplier.id,
			supplierName: inbound.supplier.name,
			reference: inbound.reference ?? null,
			activityType: "extraction_started",
			subject: "Inbound extraction started",
			headline: `${actor.name || "Unknown"} started AI extraction for inbound #${inbound.id}.`,
			documentIds: [document.id],
		});

		const extraction = await ctx.db.inboundShipmentExtraction.create({
			data: {
				inboundId: input.inboundId,
				storedDocumentId: document.id,
				status: "processing",
				provider: "openai",
				model: process.env.OPENAI_INBOUND_EXTRACTION_MODEL || "gpt-4o-mini",
			},
			select: {
				id: true,
			},
		});

		try {
			const extracted = await callOpenAIInvoiceExtraction(
				document.url || document.pathname,
			);

			await ctx.db.inboundShipmentExtraction.update({
				where: {
					id: extraction.id,
				},
				data: {
					status: "extracted",
					supplierNameRaw: extracted.payload.supplierName || null,
					invoiceNumber: extracted.payload.invoiceNumber || null,
					invoiceDate: extracted.payload.invoiceDate
						? new Date(extracted.payload.invoiceDate)
						: null,
					rawText: extracted.payload.rawText || null,
					structuredPayload: extracted.payload as any,
					model: extracted.model,
				},
			});

			if (extracted.payload.lineItems?.length) {
				await ctx.db.inboundShipmentExtractionLine.createMany({
					data: extracted.payload.lineItems.map((line, index) => ({
						extractionId: extraction.id,
						lineNo: index + 1,
						rawDescription: line.description || null,
						rawSku: line.sku || null,
						qty: line.qty == null ? null : Number(line.qty || 0),
						unitPrice:
							line.unitPrice == null ? null : Number(line.unitPrice || 0),
						matchStatus: "unresolved",
					})),
				});
			}

			await matchExtractionLines(ctx, extraction.id);

			await createInboundActivity(ctx, {
				inboundId: inbound.id,
				supplierId: inbound.supplier.id,
				supplierName: inbound.supplier.name,
				reference: inbound.reference ?? null,
				activityType: "extraction_completed",
				subject: "Inbound extraction completed",
				headline: `AI extraction completed for inbound #${inbound.id}.`,
				documentIds: [document.id],
				meta: {
					extractionId: extraction.id,
				},
			});
		} catch (error) {
			await ctx.db.inboundShipmentExtraction.update({
				where: {
					id: extraction.id,
				},
				data: {
					status: "failed",
					errorMessage:
						error instanceof Error ? error.message : "Extraction failed.",
				},
			});

			await createInboundActivity(ctx, {
				inboundId: inbound.id,
				supplierId: inbound.supplier.id,
				supplierName: inbound.supplier.name,
				reference: inbound.reference ?? null,
				activityType: "extraction_failed",
				subject: "Inbound extraction failed",
				headline: `AI extraction failed for inbound #${inbound.id}.`,
				documentIds: [document.id],
				note: error instanceof Error ? error.message : "Extraction failed.",
			});
		}

		results.push({
			id: extraction.id,
			status: "processing",
		});
	}

	return getInboundExtractionsQuery(ctx, input.inboundId);
}

export async function getInboundExtractionsQuery(
	ctx: TRPCContext,
	inboundId: number,
) {
	return ctx.db.inboundShipmentExtraction.findMany({
		where: {
			inboundId,
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			storedDocumentId: true,
			status: true,
			provider: true,
			model: true,
			supplierNameRaw: true,
			invoiceNumber: true,
			invoiceDate: true,
			rawText: true,
			errorMessage: true,
			reviewedAt: true,
			reviewedBy: true,
			createdAt: true,
			lines: {
				where: {
					deletedAt: null,
				},
				orderBy: {
					lineNo: "asc",
				},
				select: {
					id: true,
					lineNo: true,
					rawDescription: true,
					rawSku: true,
					qty: true,
					unitPrice: true,
					matchStatus: true,
					inventoryId: true,
					inventoryVariantId: true,
					inventoryCategoryId: true,
					confidence: true,
					inventory: {
						select: {
							id: true,
							name: true,
						},
					},
					inventoryVariant: {
						select: {
							id: true,
							sku: true,
						},
					},
				},
			},
		},
	});
}

export async function applyInboundExtractionQuery(
	ctx: TRPCContext,
	input: {
		inboundId: number;
		extractionId: number;
		autoAssignDemands?: boolean;
	},
) {
	const actor = await getInboundActor(ctx);
	const extraction = await ctx.db.inboundShipmentExtraction.findFirstOrThrow({
		where: {
			id: input.extractionId,
			inboundId: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			invoiceNumber: true,
			lines: {
				where: {
					deletedAt: null,
					matchStatus: {
						in: ["matched", "suggested"],
					},
					inventoryVariantId: {
						not: null,
					},
				},
				select: {
					id: true,
					qty: true,
					unitPrice: true,
					inventoryVariantId: true,
				},
			},
			inbound: {
				select: {
					id: true,
					reference: true,
					supplier: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			},
		},
	});

	const grouped = new Map<number, { qty: number; unitPrice: number | null }>();
	for (const line of extraction.lines) {
		const variantId = Number(line.inventoryVariantId || 0);
		if (!variantId) continue;
		const current = grouped.get(variantId) || { qty: 0, unitPrice: null };
		current.qty += Number(line.qty || 0);
		if (line.unitPrice != null) current.unitPrice = Number(line.unitPrice || 0);
		grouped.set(variantId, current);
	}

	const existingItems = await ctx.db.inboundShipmentItem.findMany({
		where: {
			inboundId: input.inboundId,
			deletedAt: null,
		},
		select: {
			id: true,
			inventoryVariantId: true,
			qty: true,
		},
	});
	const existingItemsByVariant = new Map(
		existingItems.map((item) => [item.inventoryVariantId, item]),
	);

	const orderNos = new Set<string>();

	for (const [inventoryVariantId, value] of grouped.entries()) {
		const existingItem = existingItemsByVariant.get(inventoryVariantId);
		const item = existingItem
			? await ctx.db.inboundShipmentItem.update({
					where: {
						id: existingItem.id,
					},
					data: {
						qty: value.qty,
						unitPrice: value.unitPrice,
					},
					select: {
						id: true,
						inventoryVariantId: true,
						qty: true,
					},
				})
			: await ctx.db.inboundShipmentItem.create({
					data: {
						inboundId: input.inboundId,
						inventoryVariantId,
						qty: value.qty,
						unitPrice: value.unitPrice,
					},
					select: {
						id: true,
						inventoryVariantId: true,
						qty: true,
					},
				});

		if (input.autoAssignDemands !== false) {
			const assignedOrderNos = await autoAssignOpenDemandsForShipmentItem(ctx, {
				inboundShipmentItemId: item.id,
				inventoryVariantId,
				qty: value.qty,
			});
			assignedOrderNos.forEach((orderNo) => orderNos.add(orderNo));
		}
	}

	await ctx.db.inboundShipmentExtraction.update({
		where: {
			id: extraction.id,
		},
		data: {
			status: "reviewed",
			reviewedAt: new Date(),
			reviewedBy: ctx.userId ?? null,
		},
	});

	await createInboundActivity(ctx, {
		inboundId: input.inboundId,
		supplierId: extraction.inbound.supplier.id,
		supplierName: extraction.inbound.supplier.name,
		reference: extraction.inbound.reference ?? extraction.invoiceNumber ?? null,
		activityType: "extraction_applied",
		subject: "Inbound extraction applied",
		headline: `${actor.name || "Unknown"} applied extraction #${extraction.id} to inbound #${input.inboundId}.`,
		orderNos: Array.from(orderNos),
		meta: {
			extractionId: extraction.id,
		},
	});

	return getInboundShipmentDetail(ctx.db, {
		inboundId: input.inboundId,
	});
}

export async function getInboundActivityQuery(
	ctx: TRPCContext,
	inboundId: number,
) {
	const activities = await ctx.db.notePad.findMany({
		where: {
			tags: {
				some: {
					tagName: "inboundId",
					tagValue: String(inboundId),
				},
			},
			deletedAt: null,
		},
		orderBy: {
			createdAt: "desc",
		},
		select: {
			id: true,
			createdAt: true,
			subject: true,
			headline: true,
			note: true,
			color: true,
			senderContact: {
				select: {
					id: true,
					name: true,
				},
			},
			tags: {
				select: {
					tagName: true,
					tagValue: true,
				},
			},
		},
	});

	const merged = activities.map((activity) => ({
		...activity,
		tags: mergeTagRows(activity.tags),
	}));

	const documentIds = Array.from(
		new Set(
			merged.flatMap((activity) => {
				const raw = activity.tags.documentIds;
				return Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
			}),
		),
	);

	const documents = documentIds.length
		? await ctx.db.storedDocument.findMany({
				where: {
					id: {
						in: documentIds,
					},
					deletedAt: null,
				},
			})
		: [];
	const docsMap = new Map(
		documents.map((document) => [
			document.id,
			normalizeStoredDocument(document as any),
		]),
	);

	return merged.map((activity) => {
		const raw = activity.tags.documentIds;
		const ids = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : [];
		return {
			...activity,
			documents: ids.map((id) => docsMap.get(id)).filter(Boolean),
		};
	});
}
