import { createHash } from "node:crypto";
import { findPendingFulfillmentNoticeCommands } from "@gnd/sales/fulfillment-notification-pending";
import { createFulfillmentNoticeActivity } from "@gnd/notifications/fulfillment-delivery";
import {
	assertDispatchInventoryReadyToStart,
	consumeDispatchBoundInventory,
} from "@gnd/sales/sales-fulfillment-plan";
import { confirmFulfillmentShortLoadInTransaction } from "@gnd/sales/fulfillment-short-load-confirm";
import { updateFulfillmentAssignmentInTransaction } from "@gnd/sales/fulfillment-assignment-update";
import { createFulfillmentAssignmentInTransaction } from "@gnd/sales/fulfillment-assignment-create";
import { fulfillmentAssignmentRevision } from "@gnd/sales/fulfillment-assignment-command";
import {
	fulfillmentBacklogEvidenceSelect,
	projectBacklogEvidence,
} from "@gnd/sales/fulfillment-backlog-query";
import { expect, test } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import { db } from "@gnd/db";
import { itemItemControlUid } from "@gnd/sales/utils/sales-control";
import {
	getFulfillmentDetail,
	getFulfillmentCompletionReview,
	getFulfillmentShortLoadPreview,
	getFulfillmentEditOptions,
	getFulfillmentAssignmentOptions,
	getFulfillmentProof,
	getFulfillmentRoute,
	getFulfillmentActivity,
	getFulfillmentExceptions,
	getFulfillmentOrder,
	getFulfillmentOrders,
} from "./fulfillment-orders";

const localTest =
	process.env.GND_FULFILLMENT_DB_TEST === "1" ? test : test.skip;

localTest(
	"order list and counts agree across multiple fulfillments and page boundaries",
	async () => {
		const target = new URL(process.env.DATABASE_URL || "mysql://missing");
		if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
			throw new Error("Fulfillment fixtures require a local database");
		}
		const rollback = new Error("ROLLBACK_ORDER_LIST_FIXTURE");
		let verified = false;
		try {
			await db.$transaction(
				async (tx) => {
					const prefix = `order-list-test-${crypto.randomUUID()}`;
					const ids: number[] = [];
					for (let index = 0; index < 2; index++) {
						const orderNo = `${prefix}-${index}`;
						const order = await tx.salesOrders.create({
							data: {
								orderId: orderNo,
								slug: orderNo,
								type: "order",
								isDyke: false,
								status: "Draft",
								deliveryOption: "delivery",
							},
						});
						ids.push(order.id);
						const item = await tx.salesOrderItems.create({
							data: {
								salesOrderId: order.id,
								qty: 10,
								description: "Order list fixture",
							},
						});
						const uid = itemItemControlUid(item.id);
						await tx.salesItemControl.create({
							data: {
								uid,
								salesId: order.id,
								orderItemId: item.id,
								shippable: true,
								produceable: false,
								qtyControls: {
									create: {
										type: "qty",
										qty: 10,
										lh: 0,
										rh: 0,
										total: 10,
										itemTotal: 10,
									},
								},
							},
						});
						if (index === 0) {
							for (const day of [10, 11])
								await tx.orderDelivery.create({
									data: {
										salesOrderId: order.id,
										status: "queue",
										deliveryMode: "delivery",
										dueDate: new Date(`2026-09-${day}T12:00:00Z`),
										meta: {
											fulfillmentAssignment: {
												version: 1,
												revision: 1,
												selectionMode: "selected",
												lines: [{ uid, quantity: { qty: 2, lh: 0, rh: 0 } }],
											},
										},
									},
								});
						}
					}
					const ctx = { db: tx } as unknown as TRPCContext;
					const input = {
						q: prefix,
						section: "dispatches" as const,
						size: 1,
						sort: ["orderId.asc"],
					};
					const first = await getFulfillmentOrders(ctx, input);
					expect(first.data.map((row) => row.id)).toEqual([ids[0]!]);
					expect(first.meta).toEqual({ count: 2, size: 1, cursor: "1" });
					expect(first.counts).toMatchObject({ all: 2, active: 1, backlog: 1 });
					expect(first.data[0]?.workspace.fulfillments).toHaveLength(2);
					expect(first.data[0]?.workspace.quantities.backlogQty).toBe(6);
					expect(first.data[0]?.invoice).toMatchObject({
						id: ids[0]!,
						invoiceTotal: 0,
						latestPaymentReview: null,
					});
					const second = await getFulfillmentOrders(ctx, {
						...input,
						cursor: first.meta.cursor!,
					});
					expect(second.data.map((row) => row.id)).toEqual([ids[1]!]);
					expect(second.meta.cursor).toBeNull();
					expect(second.counts).toEqual(first.counts);
					const scheduled = await getFulfillmentOrders(ctx, {
						...input,
						scheduleRange: ["2026-09-11T12:00:00Z", "2026-09-11T12:00:00Z"],
					});
					expect(scheduled.meta.count).toBe(1);
					expect(scheduled.counts).toMatchObject({
						all: 1,
						active: 1,
						backlog: 1,
					});
					expect(scheduled.data[0]?.workspace.fulfillments).toHaveLength(2);
					const empty = await getFulfillmentOrder(ctx, {
						salesId: ids[1]!,
						cursor: 0,
					});
					expect(empty?.fulfillmentCount).toBe(0);
					expect(empty?.workspace.quantities.lines[0]?.title).toBe(
						"Order list fixture",
					);
					const firstChild = first.data[0]!.workspace.fulfillments[0]!;
					expect(firstChild.plannedQty).toBe(2);
					const item = await tx.salesOrderItems.findFirstOrThrow({
						where: { salesOrderId: ids[0]! },
					});
					await tx.orderItemDelivery.create({
						data: {
							orderId: ids[0]!,
							orderItemId: item.id,
							orderDeliveryId: firstChild.id,
							packingStatus: "packed",
							qty: 1,
						},
					});
					await tx.orderDelivery.createMany({
						data: Array.from({ length: 21 }, () => ({
							salesOrderId: ids[0]!,
							status: "cancelled",
							deliveryMode: "delivery",
						})),
					});
					const history = await getFulfillmentOrder(ctx, {
						salesId: ids[0]!,
						cursor: 0,
					});
					expect(history?.fulfillmentCount).toBe(23);
					expect(history?.workspace.fulfillments).toHaveLength(20);
					expect(history?.nextCursor).toBe(20);
					const older = await getFulfillmentOrder(ctx, {
						salesId: ids[0]!,
						cursor: 20,
					});
					expect(older?.workspace.fulfillments).toHaveLength(3);
					expect(older?.nextCursor).toBeNull();
					expect(
						new Set(
							[
								...history!.workspace.fulfillments,
								...older!.workspace.fulfillments,
							].map((child) => child.id),
						).size,
					).toBe(23);
					expect(
						older?.workspace.fulfillments.find(
							(child) => child.id === firstChild.id,
						),
					).toMatchObject({ plannedQty: 2, packedQty: 1, deliveredQty: 0 });
					expect(
						await getFulfillmentDetail(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					const detail = await getFulfillmentDetail(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(detail?.fulfillment).toMatchObject({
						id: firstChild.id,
						plannedQty: 2,
						packedQty: 1,
						deliveredQty: 0,
					});
					expect(detail?.items).toHaveLength(1);
					expect(detail?.scopeRevision).toBe(1);
					expect(detail?.items[0]).toMatchObject({
						title: "Order list fixture",
						quantity: { qty: 2, lh: 0, rh: 0 },
					});
					const completionReview = await getFulfillmentCompletionReview(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(completionReview).toMatchObject({
						scopeRevision: 1,
						blockedReason: null,
						requiresShortLoadConfirmation: true,
					});
					expect(completionReview?.manifestRevision).toHaveLength(64);
					expect(completionReview?.lines[0]).toMatchObject({
						assigned: { qty: 2, lh: 0, rh: 0 },
						packed: { qty: 1, lh: 0, rh: 0 },
						leftBehind: { qty: 1, lh: 0, rh: 0 },
						ordered: { qty: 10, lh: 0, rh: 0 },
					});
					expect(
						await getFulfillmentCompletionReview(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					expect(
						await getFulfillmentExceptions(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					expect(
						await getFulfillmentExceptions(ctx, {
							salesId: ids[0]!,
							fulfillmentId: firstChild.id,
						}),
					).toEqual({ data: [], nextCursor: null });
					await ctx.db.dispatchException.createMany({
						data: Array.from({ length: 21 }, (_, index) => ({
							orderDeliveryId: firstChild.id,
							reasonCode: "shortage",
							notes: `Fixture ${index}`,
							reportedById: 1,
						})),
					});
					const exceptionPage = await getFulfillmentExceptions(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(exceptionPage?.data).toHaveLength(20);
					const lastExceptions = await getFulfillmentExceptions(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
						cursor: exceptionPage!.nextCursor!,
					});
					expect(lastExceptions?.data).toHaveLength(1);
					expect(lastExceptions?.nextCursor).toBeNull();
					expect(
						new Set(
							[...exceptionPage!.data, ...lastExceptions!.data].map(
								(row) => row.id,
							),
						).size,
					).toBe(21);
					expect(
						await getFulfillmentProof(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					expect(
						await getFulfillmentProof(ctx, {
							salesId: ids[0]!,
							fulfillmentId: firstChild.id,
						}),
					).toEqual({ proof: null, documents: [] });
					const foreignProof = await ctx.db.storedDocument.create({
						data: {
							kind: "signature",
							ownerType: "dispatch",
							ownerId: "foreign",
							provider: "test",
							pathname: "fixture/private",
						},
					});
					await ctx.db.orderDelivery.update({
						where: { id: firstChild.id },
						data: {
							meta: {
								dispatchCompletion: {
									requestId: "fixture-proof",
									status: "uploading",
									startedAt: new Date().toISOString(),
									signatureDocumentId: foreignProof.id,
									attachments: [],
								},
							},
						},
					});
					const proof = await getFulfillmentProof(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(proof?.documents).toHaveLength(0);
					expect(proof?.proof).toMatchObject({
						status: "uploading",
						signatureRegistered: false,
					});
					expect(
						await getFulfillmentRoute(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					await ctx.db.orderDelivery.update({
						where: { id: firstChild.id },
						data: {
							meta: {
								driverRouteDestination: {
									formattedAddress: "Fixture confirmed destination",
									placeId: "fixture-place",
									lat: 25.7,
									lng: -80.2,
								},
							},
						},
					});
					const route = await getFulfillmentRoute(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(route?.destination).toMatchObject({
						source: "driver_confirmed",
						verified: true,
						requiresNormalization: false,
						route: { formattedAddress: "Fixture confirmed destination" },
					});
					await ctx.db.salesHistory.createMany({
						data: [
							{
								salesId: ids[0]!,
								name: "Fulfillment schedule moved",
								data: {
									dispatchId: firstChild.id,
									sourceDate: "2026-09-10",
									targetDate: "2026-09-11",
								},
							},
							{ salesId: ids[0]!, name: "Unrelated order note", data: {} },
						],
					});
					expect(
						await getFulfillmentActivity(ctx, {
							salesId: ids[1]!,
							fulfillmentId: firstChild.id,
						}),
					).toBeNull();
					const activity = await getFulfillmentActivity(ctx, {
						salesId: ids[0]!,
						fulfillmentId: firstChild.id,
					});
					expect(activity?.data).toHaveLength(1);
					expect(activity?.data[0]).toMatchObject({
						name: "Fulfillment schedule moved",
						sourceDate: "2026-09-10",
						targetDate: "2026-09-11",
					});
					const actor = await tx.users.create({
						data: { email: `${prefix}@fixture.invalid`, name: "Fixture admin" },
					});
					const evidence = await tx.salesOrders.findUniqueOrThrow({
						where: { id: ids[1]! },
						select: fulfillmentBacklogEvidenceSelect,
					});
					const options = await getFulfillmentAssignmentOptions(ctx, {
						salesId: evidence.id,
					});
					expect(options?.dueDate).toBeNull();
					expect(options?.lines[0]?.quantity).toEqual({
						qty: 10,
						lh: 0,
						rh: 0,
					});
					expect(options?.canAssign).toBe(true);
					expect(options?.backlogQty).toBe(0);
					expect(options?.availableQty).toBe(10);
					expect(options?.revision).toBe(
						fulfillmentAssignmentRevision({
							salesId: evidence.id,
							projection: projectBacklogEvidence(evidence).projection,
							fulfillments: evidence.deliveries,
						}),
					);
					const assignmentInput = {
						requestId: crypto.randomUUID(),
						salesId: evidence.id,
						expectedRevision: fulfillmentAssignmentRevision({
							salesId: evidence.id,
							projection: projectBacklogEvidence(evidence).projection,
							fulfillments: evidence.deliveries,
						}),
						driverId: null,
						dueDate: null,
						deliveryMode: "delivery" as const,
						selectionMode: "selected" as const,
						lines: [
							{
								uid: evidence.itemControls[0]!.uid,
								quantity: { qty: 5, lh: 0, rh: 0 },
							},
						],
					};
					const assigned = await createFulfillmentAssignmentInTransaction(
						tx,
						assignmentInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					const replay = await createFulfillmentAssignmentInTransaction(
						tx,
						assignmentInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					expect(replay).toEqual({
						fulfillmentId: assigned.fulfillmentId,
						idempotentReplay: true,
					});
					expect(
						await tx.orderDelivery.count({
							where: { salesOrderId: evidence.id },
						}),
					).toBe(1);
					const fresh = await tx.salesOrders.findUniqueOrThrow({
						where: { id: evidence.id },
						select: fulfillmentBacklogEvidenceSelect,
					});
					expect(projectBacklogEvidence(fresh).projection.backlogQty).toBe(5);
					await expect(
						createFulfillmentAssignmentInTransaction(
							tx,
							{ ...assignmentInput, requestId: crypto.randomUUID() },
							{ id: actor.id, name: "Fixture admin" },
						),
					).rejects.toThrow("quantities changed");
					await expect(
						createFulfillmentAssignmentInTransaction(
							tx,
							{ ...assignmentInput, dueDate: "2026-09-11" },
							{ id: actor.id, name: "Fixture admin" },
						),
					).rejects.toThrow("different fulfillment command");
					const editOptions = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					expect(editOptions?.canEdit).toBe(true);
					expect(editOptions?.lines[0]).toMatchObject({
						quantity: { qty: 5, lh: 0, rh: 0 },
						capacity: { qty: 10, lh: 0, rh: 0 },
					});
					expect(
						await getFulfillmentEditOptions(ctx, {
							salesId: ids[0]!,
							fulfillmentId: assigned.fulfillmentId,
						}),
					).toBeNull();
					await tx.orderDelivery.update({
						where: { id: assigned.fulfillmentId },
						data: { status: "in progress" },
					});
					expect(
						(
							await getFulfillmentEditOptions(ctx, {
								salesId: evidence.id,
								fulfillmentId: assigned.fulfillmentId,
							})
						)?.canEdit,
					).toBe(false);
					await tx.orderDelivery.update({
						where: { id: assigned.fulfillmentId },
						data: { status: "queue" },
					});
					const editContext = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					const editInput = {
						...assignmentInput,
						fulfillmentId: assigned.fulfillmentId,
						requestId: crypto.randomUUID(),
						expectedRevision: editContext!.revision,
						lines: [
							{
								uid: evidence.itemControls[0]!.uid,
								quantity: { qty: 3, lh: 0, rh: 0 },
							},
						],
					};
					const editResult = await updateFulfillmentAssignmentInTransaction(
						tx,
						editInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					expect(editResult.changed).toBe(true);
					expect(
						(
							await updateFulfillmentAssignmentInTransaction(tx, editInput, {
								id: actor.id,
								name: "Fixture admin",
							})
						).idempotentReplay,
					).toBe(true);
					const afterEdit = await tx.salesOrders.findUniqueOrThrow({
						where: { id: evidence.id },
						select: fulfillmentBacklogEvidenceSelect,
					});
					expect(projectBacklogEvidence(afterEdit).projection.backlogQty).toBe(
						7,
					);
					await tx.orderDelivery.update({
						where: { id: assigned.fulfillmentId },
						data: { dueDate: new Date("2026-09-11T12:00:00.000Z") },
					});
					const unchangedContext = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					const unchangedInput = {
						...editInput,
						requestId: crypto.randomUUID(),
						expectedRevision: unchangedContext!.revision,
						dueDate: "2026-09-11",
					};
					const unchanged = await updateFulfillmentAssignmentInTransaction(
						tx,
						unchangedInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					expect(unchanged.changed).toBe(false);
					const unchangedHeader = await tx.orderDelivery.findUniqueOrThrow({
						where: { id: assigned.fulfillmentId },
					});
					expect(unchangedHeader.dueDate?.toISOString()).toBe(
						"2026-09-11T12:00:00.000Z",
					);
					expect(
						(await getFulfillmentEditOptions(ctx, {
							salesId: evidence.id,
							fulfillmentId: assigned.fulfillmentId,
						}))!.revision,
					).toBe(unchangedContext!.revision);
					await tx.orderItemDelivery.create({
						data: {
							orderId: evidence.id,
							orderItemId: evidence.itemControls[0]!.orderItemId!,
							orderDeliveryId: assigned.fulfillmentId,
							packingStatus: "packed",
							qty: 2,
						},
					});
					const packedContext = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					const rejectedRequestId = crypto.randomUUID();
					await expect(
						updateFulfillmentAssignmentInTransaction(
							tx,
							{
								...unchangedInput,
								requestId: rejectedRequestId,
								expectedRevision: packedContext!.revision,
								lines: [
									{
										uid: evidence.itemControls[0]!.uid,
										quantity: { qty: 1, lh: 0, rh: 0 },
									},
								],
							},
							{ id: actor.id, name: "Fixture admin" },
						),
					).rejects.toThrow("Unpack or return");
					expect(
						await tx.salesHistory.findUnique({
							where: { id: rejectedRequestId },
						}),
					).toBeNull();
					expect(
						(await getFulfillmentEditOptions(ctx, {
							salesId: evidence.id,
							fulfillmentId: assigned.fulfillmentId,
						}))!.scope?.lines[0]?.quantity.qty,
					).toBe(3);
					const remainingOptions = await getFulfillmentAssignmentOptions(ctx, {
						salesId: evidence.id,
					});
					const fullRemainder = await createFulfillmentAssignmentInTransaction(
						tx,
						{
							...assignmentInput,
							requestId: crypto.randomUUID(),
							expectedRevision: remainingOptions!.revision,
							selectionMode: "all_remaining",
							lines: [],
						},
						{ id: actor.id, name: "Fixture admin" },
					);
					const fullyAssignedOrder = await getFulfillmentOrder(ctx, {
						salesId: evidence.id,
						cursor: 0,
					});
					expect(fullyAssignedOrder!.workspace.quantities.resolved).toBe(true);
					expect(
						fullyAssignedOrder!.workspace.quantities.lines.reduce(
							(sum, line) =>
								sum + line.assigned.qty + line.assigned.lh + line.assigned.rh,
							0,
						),
					).toBe(10);
					expect(fullyAssignedOrder!.workspace.quantities.backlogQty).toBe(0);
					expect(
						fullyAssignedOrder!.workspace.fulfillments.find(
							(item) => item.id === fullRemainder.fulfillmentId,
						)?.plannedQty,
					).toBe(7);
					const category = await tx.inventoryCategory.create({
						data: { title: "Short load fixture", uid: crypto.randomUUID() },
					});
					const inventory = await tx.inventory.create({
						data: {
							name: "Short load fixture",
							uid: crypto.randomUUID(),
							inventoryCategoryId: category.id,
						},
					});
					const variant = await tx.inventoryVariant.create({
						data: { uid: crypto.randomUUID(), inventoryId: inventory.id },
					});
					const subComponent = await tx.subComponents.create({
						data: { inventoryCategoryId: category.id },
					});
					const inventoryLine = await tx.lineItem.create({
						data: {
							lineItemType: "SALE",
							saleId: evidence.id,
							salesItemId: evidence.itemControls[0]!.orderItemId!,
							qty: 10,
							inventoryId: inventory.id,
							inventoryVariantId: variant.id,
							inventoryCategoryId: category.id,
						},
					});
					const component = await tx.lineItemComponents.create({
						data: {
							lineItemId: inventoryLine.id,
							subComponentId: subComponent.id,
							inventoryVariantId: variant.id,
							qty: 20,
							required: true,
						},
					});
					const allocation = await tx.stockAllocation.create({
						data: {
							lineItemComponentId: component.id,
							inventoryVariantId: variant.id,
							orderDeliveryId: assigned.fulfillmentId,
							qty: 6,
							status: "picked",
						},
					});
					const shortOptions = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					const shortInput = {
						requestId: crypto.randomUUID(),
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
						expectedRevision: shortOptions!.revision,
					};
					const preview = await getFulfillmentShortLoadPreview(ctx, {
						salesId: evidence.id,
						fulfillmentId: assigned.fulfillmentId,
					});
					expect(preview?.canConfirm).toBe(true);
					expect(preview?.releasedQty).toBe(1);
					expect(preview?.revision).toBe(shortInput.expectedRevision);
					await tx.orderItemDelivery.updateMany({
						where: {
							orderDeliveryId: assigned.fulfillmentId,
							packingStatus: "packed",
						},
						data: { qty: 3 },
					});
					await expect(
						confirmFulfillmentShortLoadInTransaction(tx, shortInput, {
							id: actor.id,
							name: "Fixture admin",
						}),
					).rejects.toThrow("Refresh");
					expect(
						await tx.salesHistory.findUnique({
							where: { id: shortInput.requestId },
						}),
					).toBeNull();
					await tx.orderItemDelivery.updateMany({
						where: {
							orderDeliveryId: assigned.fulfillmentId,
							packingStatus: "packed",
						},
						data: { qty: 2 },
					});
					expect(preview?.requiresPhysicalReturn).toBe(true);
					expect(preview?.inventoryReleases).toEqual([
						{
							allocationId: allocation.id,
							qty: 2,
							requiresPhysicalReturn: true,
						},
					]);
					await expect(
						confirmFulfillmentShortLoadInTransaction(tx, shortInput, {
							id: actor.id,
							name: "Fixture admin",
						}),
					).rejects.toThrow("inventory preview");
					const inventoryShortInput = {
						...shortInput,
						expectedInventoryRevision: preview!.inventoryRevision!,
						physicalReturnsConfirmed: true,
					};
					await expect(
						confirmFulfillmentShortLoadInTransaction(
							tx,
							{ ...inventoryShortInput, physicalReturnsConfirmed: false },
							{ id: actor.id, name: "Fixture admin" },
						),
					).rejects.toThrow("physically returned");
					expect(
						(
							await tx.stockAllocation.findUnique({
								where: { id: allocation.id },
							})
						)?.qty,
					).toBe(6);
					const confirmedShort = await confirmFulfillmentShortLoadInTransaction(
						tx,
						inventoryShortInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					expect(confirmedShort.releasedQty).toBe(1);
					expect(
						(
							await tx.orderDelivery.findUnique({
								where: { id: assigned.fulfillmentId },
							})
						)?.status,
					).toBe("packed");
					expect(
						(
							await tx.stockAllocation.findUnique({
								where: { id: allocation.id },
							})
						)?.qty,
					).toBe(4);
					expect(
						await tx.stockAllocation.count({
							where: {
								lineItemComponentId: component.id,
								status: "released",
								qty: 2,
							},
						}),
					).toBe(1);
					expect(
						(
							await confirmFulfillmentShortLoadInTransaction(
								tx,
								inventoryShortInput,
								{ id: actor.id, name: "Fixture admin" },
							)
						).idempotentReplay,
					).toBe(true);
					await expect(
						confirmFulfillmentShortLoadInTransaction(
							tx,
							{
								...inventoryShortInput,
								physicalReturnsConfirmed: false,
							},
							{ id: actor.id, name: "Fixture admin" },
						),
					).rejects.toThrow("another command");
					expect(
						(await getFulfillmentOrder(ctx, {
							salesId: evidence.id,
							cursor: 0,
						}))!.workspace.quantities.backlogQty,
					).toBe(1);
					expect(
						await assertDispatchInventoryReadyToStart(tx, {
							orderDeliveryId: assigned.fulfillmentId,
							salesOrderId: evidence.id,
						}),
					).toEqual({ executionMode: "inventory", componentCount: 1 });
					// Model a persisted delivered short load; completion command side effects are tested separately.
					await tx.orderDelivery.update({
						where: { id: assigned.fulfillmentId },
						data: {
							status: "completed",
							deliveredAt: new Date("2026-09-09T12:00:00Z"),
							meta: {
								...((
									await tx.orderDelivery.findUniqueOrThrow({
										where: { id: assigned.fulfillmentId },
									})
								).meta as object),
								dispatchCompletion: { status: "completed" },
								inventoryDispatch: { status: "consumed" },
							},
						},
					});
					const consumed = await consumeDispatchBoundInventory(tx, {
						orderDeliveryId: assigned.fulfillmentId,
						salesOrderId: evidence.id,
					});
					expect(consumed).toMatchObject({
						executionMode: "inventory",
						allocationIds: [allocation.id],
						consumedQty: 4,
					});
					expect(
						(
							await tx.stockAllocation.findUniqueOrThrow({
								where: { id: allocation.id },
							})
						).status,
					).toBe("consumed");
					expect(
						await tx.stockAllocation.count({
							where: {
								lineItemComponentId: component.id,
								status: "released",
								qty: 2,
							},
						}),
					).toBe(1);
					await tx.salesOrders.update({
						where: { id: evidence.id },
						data: {
							shippingAddress: {
								create: {
									address1: "Fixture destination",
									meta: { placeId: "fixture-place", lat: 25, lng: -80 },
								},
							},
						},
					});
					const nextOptions = await getFulfillmentAssignmentOptions(ctx, {
						salesId: evidence.id,
					});
					expect(
						nextOptions!.lines.reduce(
							(sum, line) =>
								sum + line.quantity.qty + line.quantity.lh + line.quantity.rh,
							0,
						),
					).toBe(1);
					const nextInput = {
						...assignmentInput,
						requestId: crypto.randomUUID(),
						expectedRevision: nextOptions!.revision,
						selectionMode: "all_remaining" as const,
						lines: [],
						dueDate: "2026-09-11",
						driverId: actor.id,
						deliveryMode: "delivery" as const,
					};
					const next = await createFulfillmentAssignmentInTransaction(
						tx,
						nextInput,
						{ id: actor.id, name: "Fixture admin" },
					);
					expect(
						(
							await createFulfillmentAssignmentInTransaction(tx, nextInput, {
								id: actor.id,
								name: "Fixture admin",
							})
						).idempotentReplay,
					).toBe(true);
					await tx.orderDelivery.update({
						where: { id: next.fulfillmentId },
						data: { deliveryMode: "pickup" },
					});
					expect(
						(await findPendingFulfillmentNoticeCommands(tx)).requestIds,
					).toContain(nextInput.requestId);
					const noticeId = await createFulfillmentNoticeActivity(tx, {
						version: 1,
						eventKey: `${nextInput.requestId}:sales_dispatch_assigned:${actor.id}`,
						channel: "sales_dispatch_assigned",
						recipientId: actor.id,
						actorId: actor.id,
						salesId: evidence.id,
						fulfillmentId: next.fulfillmentId,
						dueDate: "2026-09-11",
						deliveryMode: "delivery",
					});
					const notice = await tx.notePad.findUniqueOrThrow({
						where: { id: noticeId },
						include: { recipients: { include: { contact: true } }, tags: true },
					});
					expect(notice.subject).toBe("Dispatch assigned");
					expect(notice.tags).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								tagName: "deliveryMode",
								tagValue: JSON.stringify("delivery"),
							}),
						]),
					);
					await tx.orderDelivery.update({
						where: { id: next.fulfillmentId },
						data: { deliveryMode: "delivery" },
					});
					expect(notice.recipients).toHaveLength(1);
					expect(notice.recipients[0]!.contact.profileId).toBe(actor.id);
					const eventKey = `${nextInput.requestId}:sales_dispatch_assigned:${actor.id}`;
					await tx.salesHistory.create({
						data: {
							id: createHash("sha256")
								.update(`fulfillment-notice:${eventKey}`)
								.digest("hex"),
							salesId: evidence.id,
							name: "Fulfillment notification delivered",
							data: {
								event: "FULFILLMENT_NOTICE_DELIVERED",
								eventKey,
								activityId: noticeId,
								dispatchId: next.fulfillmentId,
								recipientId: actor.id,
							},
						},
					});
					expect(
						(await findPendingFulfillmentNoticeCommands(tx)).requestIds,
					).not.toContain(nextInput.requestId);
					expect(notice.tags).toEqual(
						expect.arrayContaining([
							expect.objectContaining({
								tagName: "fulfillmentEventKey",
								tagValue: JSON.stringify(
									`${nextInput.requestId}:sales_dispatch_assigned:${actor.id}`,
								),
							}),
						]),
					);
					const afterNext = await getFulfillmentOrder(ctx, {
						salesId: evidence.id,
						cursor: 0,
					});
					expect(afterNext!.workspace.quantities.backlogQty).toBe(0);
					expect(
						(
							await tx.salesHistory.findUniqueOrThrow({
								where: { id: nextInput.requestId },
							})
						).data,
					).toMatchObject({
						notificationIntents: [
							{
								eventKey: `${nextInput.requestId}:sales_dispatch_assigned:${actor.id}`,
								recipientId: actor.id,
								actorId: actor.id,
								salesId: evidence.id,
								fulfillmentId: next.fulfillmentId,
								channel: "sales_dispatch_assigned",
							},
						],
					});
					expect(
						afterNext!.workspace.fulfillments.find(
							(row) => row.id === next.fulfillmentId,
						)?.plannedQty,
					).toBe(1);
					expect(
						(
							await tx.orderDelivery.findUnique({
								where: { id: assigned.fulfillmentId },
							})
						)?.status,
					).toBe("completed");
					expect(
						afterNext!.workspace.fulfillments.find(
							(row) => row.id === fullRemainder.fulfillmentId,
						)?.plannedQty,
					).toBe(7);
					await tx.salesOrders.update({
						where: { id: evidence.id },
						data: { status: "cancelled" },
					});
					const cancelledOptions = await getFulfillmentEditOptions(ctx, {
						salesId: evidence.id,
						fulfillmentId: fullRemainder.fulfillmentId,
					});
					expect(cancelledOptions?.canEdit).toBe(false);
					expect(cancelledOptions?.blockedReason).toBe(
						"This order is closed for fulfillment edits.",
					);
					expect(cancelledOptions?.lines[0]?.title).toBe("Order list fixture");
					verified = true;
					throw rollback;
				},
				{ timeout: 30000 },
			);
		} catch (error) {
			if (error !== rollback) throw error;
		}
		expect(verified).toBe(true);
	},
	40000,
);
