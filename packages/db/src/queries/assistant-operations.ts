import { createHash } from "node:crypto";
import type { Database, Prisma } from "../index";
import {
	type AssistantBusinessActor,
	type AssistantPageInput,
	assistantSalesScopeWhere,
} from "./assistant-sales";

function revision(values: unknown[]) {
	return createHash("sha256")
		.update(JSON.stringify(values))
		.digest("hex")
		.slice(0, 24);
}

function organizationId(actor: AssistantBusinessActor) {
	if (actor.scopeType !== "organization") return null;
	const id = Number(actor.scopeId);
	if (!Number.isSafeInteger(id) || id <= 0)
		throw new Error("Assistant organization scope is invalid");
	return id;
}

function activeCommunityArchiveWhere() {
	return { OR: [{ archived: false }, { archived: null }] };
}

function canViewCommunityJobs(actor: AssistantBusinessActor) {
	return Boolean(actor.grants?.viewJobs || actor.grants?.editJobs);
}

function canViewCommunityInvoices(actor: AssistantBusinessActor) {
	return Boolean(actor.grants?.viewInvoice || actor.grants?.editInvoice);
}

function canViewCommunityDocuments(actor: AssistantBusinessActor) {
	return Boolean(actor.grants?.viewDocuments || actor.grants?.editDocuments);
}

export async function getAssistantProductionAccessibleOrderIds(
	db: Database,
	actor: AssistantBusinessActor,
	orderIds: number[],
) {
	if (actor.scopeType === "user" && Number(actor.scopeId) !== actor.userId)
		throw new Error("Assistant Production actor scope is invalid");
	if (orderIds.length === 0) return [];
	if (
		actor.scopeType === "organization" &&
		actor.grants?.editProduction === true
	) {
		const orders = await db.salesOrders.findMany({
			where: {
				id: { in: orderIds },
				...assistantSalesScopeWhere(actor),
				deletedAt: null,
				archivedAt: null,
				type: "order",
			},
			select: { id: true },
		});
		return orders.map(({ id }) => id);
	}
	const assignments = await db.orderItemProductionAssignments.findMany({
		where: {
			orderId: { in: orderIds },
			assignedToId: actor.userId,
			deletedAt: null,
			order: {
				...assistantSalesScopeWhere(actor),
				deletedAt: null,
				archivedAt: null,
				type: "order",
			},
		},
		distinct: ["orderId"],
		select: { orderId: true },
	});
	return assignments.map(({ orderId }) => orderId);
}

export async function findAssistantProductionAssignments(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput,
) {
	if (actor.scopeType === "user" && Number(actor.scopeId) !== actor.userId)
		throw new Error("Assistant Production actor scope is invalid");
	const workerScope =
		actor.scopeType === "user" || actor.grants?.editProduction !== true
			? { assignedToId: actor.userId }
			: {};
	const query = input.query?.trim();
	const rows = await db.orderItemProductionAssignments.findMany({
		where: {
			AND: [
				{ deletedAt: null },
				workerScope,
				{
					order: {
						...assistantSalesScopeWhere(actor),
						deletedAt: null,
						archivedAt: null,
						type: "order",
					},
				},
				...(query
					? [
							{
								OR: [
									{ order: { orderId: { contains: query } } },
									{ assignedTo: { name: { contains: query } } },
								],
							},
						]
					: []),
			],
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: {
			id: true,
			qtyAssigned: true,
			qtyCompleted: true,
			startedAt: true,
			completedAt: true,
			dueDate: true,
			updatedAt: true,
			assignedTo: { select: { id: true, name: true } },
			order: {
				select: { id: true, orderId: true, title: true, updatedAt: true },
			},
		},
	});
	const page = rows.slice(0, input.limit);
	return {
		items: page.map((row) => ({
			id: row.id,
			orderId: row.order.id,
			orderNo: row.order.orderId,
			orderTitle: row.order.title || null,
			workerId: row.assignedTo?.id || null,
			workerName: row.assignedTo?.name || null,
			assignedQuantity:
				row.qtyAssigned == null ? null : String(row.qtyAssigned),
			completedQuantity:
				row.qtyCompleted == null ? null : String(row.qtyCompleted),
			startedAt: row.startedAt?.toISOString?.() || null,
			completedAt: row.completedAt?.toISOString?.() || null,
			dueAt: row.dueDate?.toISOString?.() || null,
			revision: revision([
				row.id,
				row.updatedAt,
				row.qtyAssigned,
				row.qtyCompleted,
				row.startedAt,
				row.completedAt,
				row.dueDate,
				row.order.orderId,
				row.order.title,
				row.order.updatedAt,
			]),
		})),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function findAssistantInventoryAvailability(
	db: Database,
	input: AssistantPageInput,
) {
	const query = input.query?.trim();
	const rows = await db.inventoryVariant.findMany({
		where: {
			deletedAt: null,
			inventory: { deletedAt: null },
			...(query
				? {
						OR: [
							{ uid: { contains: query } },
							{ sku: { contains: query } },
							{ inventory: { name: { contains: query } } },
							{ inventory: { uid: { contains: query } } },
						],
					}
				: {}),
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: {
			id: true,
			uid: true,
			sku: true,
			status: true,
			lowStockAlert: true,
			updatedAt: true,
			inventory: {
				select: {
					id: true,
					name: true,
					uid: true,
					stockMode: true,
					status: true,
				},
			},
		},
	});
	const page = rows.slice(0, input.limit);
	const variantIds = page.map((row) => row.id);
	const [
		stockTotals,
		allocationTotals,
		pendingAllocationTotals,
		demandTotals,
		inboundTotals,
	] = variantIds.length
		? await Promise.all([
				db.inventoryStock.groupBy({
					by: ["inventoryVariantId"],
					where: { inventoryVariantId: { in: variantIds }, deletedAt: null },
					_sum: { qty: true },
					_max: { updatedAt: true },
					_count: { _all: true },
				}),
				db.stockAllocation.groupBy({
					by: ["inventoryVariantId"],
					where: {
						inventoryVariantId: { in: variantIds },
						deletedAt: null,
						status: { in: ["approved", "reserved", "picked", "consumed"] },
					},
					_sum: { qty: true },
					_max: { updatedAt: true },
					_count: { _all: true },
				}),
				db.stockAllocation.groupBy({
					by: ["inventoryVariantId"],
					where: {
						inventoryVariantId: { in: variantIds },
						deletedAt: null,
						status: "pending_review",
					},
					_sum: { qty: true },
					_max: { updatedAt: true },
					_count: { _all: true },
				}),
				db.inboundDemand.groupBy({
					by: ["inventoryVariantId"],
					where: {
						inventoryVariantId: { in: variantIds },
						deletedAt: null,
						status: { notIn: ["received", "cancelled"] },
					},
					_sum: { qty: true, qtyReceived: true },
					_max: { updatedAt: true },
					_count: { _all: true },
				}),
				db.inboundShipmentItem.groupBy({
					by: ["inventoryVariantId"],
					where: {
						inventoryVariantId: { in: variantIds },
						deletedAt: null,
						inbound: {
							deletedAt: null,
							status: { in: ["pending", "in_progress", "issue_open"] },
						},
					},
					_sum: { qty: true, qtyGood: true },
					_max: { updatedAt: true },
					_count: { _all: true },
				}),
			])
		: [[], [], [], [], []];
	const byVariant = <T extends { inventoryVariantId: number }>(values: T[]) =>
		new Map(values.map((value) => [value.inventoryVariantId, value]));
	const stocks = byVariant(stockTotals);
	const allocations = byVariant(allocationTotals);
	const pendingAllocations = byVariant(pendingAllocationTotals);
	const demands = byVariant(demandTotals);
	const inbounds = byVariant(inboundTotals);
	return {
		items: page.map((row) => {
			const stock = stocks.get(row.id);
			const allocation = allocations.get(row.id);
			const pendingAllocation = pendingAllocations.get(row.id);
			const demandEvidence = demands.get(row.id);
			const inboundEvidence = inbounds.get(row.id);
			const physical = stock?._sum.qty || 0;
			const allocated = allocation?._sum.qty || 0;
			const inbound = Math.max(
				0,
				(inboundEvidence?._sum.qty || 0) - (inboundEvidence?._sum.qtyGood || 0),
			);
			const demand = Math.max(
				0,
				(demandEvidence?._sum.qty || 0) -
					(demandEvidence?._sum.qtyReceived || 0),
			);
			return {
				id: row.inventory.id,
				variantId: row.id,
				uid: row.inventory.uid,
				variantUid: row.uid,
				sku: row.sku || null,
				name: row.inventory.name,
				stockMode: row.inventory.stockMode || null,
				status: row.status || row.inventory.status || null,
				physicalQuantity: String(physical),
				allocatedQuantity: String(allocated),
				pendingAllocationQuantity: String(pendingAllocation?._sum.qty || 0),
				availableQuantity: String(physical - allocated),
				inboundQuantity: String(inbound),
				demandQuantity: String(demand),
				lowStock:
					row.lowStockAlert != null &&
					physical - allocated <= row.lowStockAlert,
				blockers: [
					...(physical - allocated < 0 ? ["overallocated"] : []),
					...(demand > inbound ? ["inbound_shortfall"] : []),
				] as Array<"overallocated" | "inbound_shortfall">,
				revision: revision([
					row.id,
					row.updatedAt,
					stock,
					allocation,
					pendingAllocation,
					demandEvidence,
					inboundEvidence,
				]),
			};
		}),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export async function findAssistantCommunityProjects(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput,
) {
	const orgId = organizationId(actor);
	if (!orgId)
		throw new Error("Assistant Community requires organization scope");
	const canViewJobs = canViewCommunityJobs(actor);
	const canViewInvoices = canViewCommunityInvoices(actor);
	const query = input.query?.trim();
	const rows = await db.projects.findMany({
		where: {
			orgId,
			deletedAt: null,
			AND: [
				...(!input.includeArchived ? [activeCommunityArchiveWhere()] : []),
				...(query
					? [
							{
								OR: [
									{ title: { contains: query } },
									{ refNo: { contains: query } },
									{ slug: { contains: query } },
								],
							},
						]
					: []),
			],
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: {
			id: true,
			title: true,
			refNo: true,
			slug: true,
			archived: true,
			updatedAt: true,
			builder: { select: { name: true } },
			_count: {
				select: {
					homes: {
						where: { deletedAt: null, ...activeCommunityArchiveWhere() },
					},
					jobs: { where: canViewJobs ? { deletedAt: null } : { id: -1 } },
					invoices: {
						where: canViewInvoices ? { deletedAt: null } : { id: -1 },
					},
				},
			},
			homes: {
				where: { deletedAt: null, ...activeCommunityArchiveWhere() },
				orderBy: { id: "desc" },
				take: 5,
				select: {
					id: true,
					slug: true,
					lotBlock: true,
					modelName: true,
					status: true,
					updatedAt: true,
					_count: {
						select: {
							tasks: {
								where: canViewJobs
									? { deletedAt: null, ...activeCommunityArchiveWhere() }
									: { id: -1 },
							},
							jobs: {
								where: canViewJobs ? { deletedAt: null } : { id: -1 },
							},
							invoices: {
								where: canViewInvoices ? { deletedAt: null } : { id: -1 },
							},
						},
					},
				},
			},
		},
	});
	const page = rows.slice(0, input.limit);
	return {
		items: page.map((row) => ({
			id: row.id,
			slug: row.slug || `project-${row.id}`,
			title: row.title || `Project ${row.id}`,
			refNo: row.refNo || null,
			builderName: row.builder?.name || null,
			archived: Boolean(row.archived),
			unitCount: row._count.homes,
			jobCount: canViewJobs ? row._count.jobs : 0,
			invoiceCount: canViewInvoices ? row._count.invoices : 0,
			units: row.homes.map((home) => ({
				id: home.id,
				slug: home.slug || `unit-${home.id}`,
				lotBlock: home.lotBlock || null,
				modelName: home.modelName || null,
				status: home.status || null,
				taskCount: canViewJobs ? home._count.tasks : 0,
				jobCount: canViewJobs ? home._count.jobs : 0,
				invoiceCount: canViewInvoices ? home._count.invoices : 0,
			})),
			revision: revision([row.id, row.updatedAt, row._count, row.homes]),
		})),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

function isCommunityUnitRestricted(actor: AssistantBusinessActor) {
	const grants = actor.grants || {};
	return Boolean(
		(grants.viewCommunityUnit || grants.editCommunityUnit) &&
			!grants.editProject &&
			!grants.editCommunity &&
			!grants.viewCost &&
			!grants.editCost,
	);
}

export async function getAssistantCommunityProjectSummary(
	db: Database,
	actor: AssistantBusinessActor,
	projectId: number,
) {
	const orgId = organizationId(actor);
	if (!orgId)
		throw new Error("Assistant Community requires organization scope");
	const restricted = isCommunityUnitRestricted(actor);
	const canViewJobs = canViewCommunityJobs(actor);
	const canViewInvoices = canViewCommunityInvoices(actor);
	const canViewDocuments = canViewCommunityDocuments(actor);
	const canViewInvoiceAmounts = Boolean(!restricted && canViewInvoices);
	const project = await db.projects.findFirst({
		where: {
			id: projectId,
			orgId,
			deletedAt: null,
			...activeCommunityArchiveWhere(),
		},
		select: {
			id: true,
			title: true,
			refNo: true,
			slug: true,
			archived: true,
			updatedAt: true,
			builder: { select: { name: true } },
			homes: {
				where: { deletedAt: null, ...activeCommunityArchiveWhere() },
				orderBy: { id: "desc" },
				take: 10,
				select: {
					id: true,
					slug: true,
					lotBlock: true,
					modelName: true,
					status: true,
					updatedAt: true,
				},
			},
			jobs: {
				where: canViewJobs ? { deletedAt: null } : { id: -1 },
				orderBy: { id: "desc" },
				take: 10,
				select: {
					id: true,
					title: true,
					type: true,
					status: true,
					updatedAt: true,
				},
			},
			homeTasks: {
				where: canViewJobs
					? { deletedAt: null, ...activeCommunityArchiveWhere() }
					: { id: -1 },
				orderBy: { id: "desc" },
				take: 10,
				select: {
					id: true,
					homeId: true,
					taskName: true,
					status: true,
					productionStatus: true,
					updatedAt: true,
				},
			},
			invoices: {
				where: canViewInvoices ? { deletedAt: null } : { id: -1 },
				orderBy: { id: "desc" },
				take: 10,
				select: {
					id: true,
					refNo: true,
					taskName: true,
					checkDate: true,
					updatedAt: true,
					amount: canViewInvoiceAmounts,
				},
			},
		},
	});
	if (!project) return null;
	const [
		unitWatermark,
		jobWatermark,
		taskWatermark,
		invoiceWatermark,
		documentWatermark,
		documents,
	] = await Promise.all([
		db.homes.aggregate({
			where: {
				projectId,
				deletedAt: null,
				...activeCommunityArchiveWhere(),
			},
			_max: { updatedAt: true },
			_count: { _all: true },
		}),
		canViewJobs
			? db.jobs.aggregate({
					where: { projectId, deletedAt: null },
					_max: { updatedAt: true },
					_count: { _all: true },
				})
			: Promise.resolve({ _max: { updatedAt: null }, _count: { _all: 0 } }),
		canViewJobs
			? db.homeTasks.aggregate({
					where: {
						projectId,
						deletedAt: null,
						...activeCommunityArchiveWhere(),
					},
					_max: { updatedAt: true },
					_count: { _all: true },
				})
			: Promise.resolve({ _max: { updatedAt: null }, _count: { _all: 0 } }),
		canViewInvoices
			? db.invoices.aggregate({
					where: { projectId, deletedAt: null },
					_max: { updatedAt: true },
					_count: { _all: true },
				})
			: Promise.resolve({ _max: { updatedAt: null }, _count: { _all: 0 } }),
		canViewDocuments
			? db.storedDocument.aggregate({
					where: {
						ownerType: "community_project",
						ownerId: String(projectId),
						deletedAt: null,
						status: "ready",
						isCurrent: true,
						visibility: "private",
					},
					_max: { updatedAt: true },
					_count: { _all: true },
				})
			: Promise.resolve({ _max: { updatedAt: null }, _count: { _all: 0 } }),
		canViewDocuments
			? db.storedDocument.findMany({
					where: {
						ownerType: "community_project",
						ownerId: String(projectId),
						deletedAt: null,
						status: "ready",
						isCurrent: true,
						visibility: "private",
					},
					orderBy: { id: "desc" },
					take: 10,
					select: {
						id: true,
						title: true,
						filename: true,
						mimeType: true,
						size: true,
						updatedAt: true,
					},
				})
			: Promise.resolve([]),
	]);
	return {
		id: project.id,
		slug: project.slug || `project-${project.id}`,
		title: project.title || `Project ${project.id}`,
		refNo: project.refNo || null,
		builderName: project.builder?.name || null,
		archived: Boolean(project.archived),
		counts: {
			units: unitWatermark._count._all,
			jobs: jobWatermark._count._all,
			tasks: taskWatermark._count._all,
			invoices: invoiceWatermark._count._all,
			documents: documentWatermark._count._all,
		},
		units: project.homes.map((unit) => ({
			id: unit.id,
			slug: unit.slug || `unit-${unit.id}`,
			lotBlock: unit.lotBlock || null,
			modelName: unit.modelName || null,
			status: unit.status || null,
		})),
		jobs: canViewJobs
			? project.jobs.map((job) => ({
					id: job.id,
					title: job.title || `Job ${job.id}`,
					type: job.type || null,
					status: job.status,
				}))
			: [],
		tasks: canViewJobs
			? project.homeTasks.map((task) => ({
					id: task.id,
					unitId: task.homeId || null,
					title: task.taskName || `Task ${task.id}`,
					status: task.status || null,
					productionStatus: task.productionStatus || null,
				}))
			: [],
		invoices: canViewInvoices
			? project.invoices.map((invoice) => ({
					id: invoice.id,
					refNo: invoice.refNo || null,
					title: invoice.taskName || `Invoice ${invoice.id}`,
					checkDate: invoice.checkDate?.toISOString?.() || null,
					amount:
						canViewInvoiceAmounts &&
						"amount" in invoice &&
						invoice.amount != null
							? String(invoice.amount)
							: null,
				}))
			: [],
		documents: documents.map((document) => ({
			id: document.id,
			title: document.title || document.filename || "Project document",
			mimeType: document.mimeType || null,
			size: document.size || null,
		})),
		revision: revision([
			project.id,
			project.updatedAt,
			unitWatermark,
			jobWatermark,
			taskWatermark,
			invoiceWatermark,
			documentWatermark,
		]),
	};
}

export async function findAssistantCommunityUnits(
	db: Database,
	actor: AssistantBusinessActor,
	input: AssistantPageInput & { projectId: number },
) {
	const orgId = organizationId(actor);
	if (!orgId)
		throw new Error("Assistant Community requires organization scope");
	const canViewJobs = canViewCommunityJobs(actor);
	const canViewInvoices = canViewCommunityInvoices(actor);
	const project = await db.projects.findFirst({
		where: {
			id: input.projectId,
			orgId,
			deletedAt: null,
			...activeCommunityArchiveWhere(),
		},
		select: { id: true },
	});
	if (!project) return null;
	const query = input.query?.trim();
	const rows = await db.homes.findMany({
		where: {
			projectId: project.id,
			deletedAt: null,
			AND: [
				...(!input.includeArchived ? [activeCommunityArchiveWhere()] : []),
				...(query
					? [
							{
								OR: [
									{ lotBlock: { contains: query } },
									{ modelName: { contains: query } },
									{ slug: { contains: query } },
								],
							},
						]
					: []),
			],
		},
		...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 as const } : {}),
		orderBy: { id: "desc" },
		take: input.limit + 1,
		select: {
			id: true,
			slug: true,
			lotBlock: true,
			modelName: true,
			status: true,
			updatedAt: true,
			_count: {
				select: {
					tasks: {
						where: canViewJobs
							? { deletedAt: null, ...activeCommunityArchiveWhere() }
							: { id: -1 },
					},
					jobs: { where: canViewJobs ? { deletedAt: null } : { id: -1 } },
					invoices: {
						where: canViewInvoices ? { deletedAt: null } : { id: -1 },
					},
				},
			},
		},
	});
	const page = rows.slice(0, input.limit);
	return {
		projectId: project.id,
		items: page.map((unit) => ({
			id: unit.id,
			slug: unit.slug || `unit-${unit.id}`,
			lotBlock: unit.lotBlock || null,
			modelName: unit.modelName || null,
			status: unit.status || null,
			taskCount: canViewJobs ? unit._count.tasks : 0,
			jobCount: canViewJobs ? unit._count.jobs : 0,
			invoiceCount: canViewInvoices ? unit._count.invoices : 0,
			revision: revision([unit.id, unit.updatedAt, unit._count]),
		})),
		nextCursor: rows.length > input.limit ? (page.at(-1)?.id ?? null) : null,
	};
}

export type AssistantOperationsWhere =
	Prisma.OrderItemProductionAssignmentsWhereInput;
