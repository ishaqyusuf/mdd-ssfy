import { db } from "@gnd/db";
import {
	type CreateStoredDocumentRecordInput,
	type StoredDocumentRepository,
	type UpdateStoredDocumentRecordInput,
	buildOwnerDocumentFolder,
	createDocumentRegistry,
	createDocumentService,
	createVercelBlobProvider,
} from "@gnd/documents";
import { appendActivityTags } from "@gnd/notifications/activities";
import { renderSalesPdfBuffer } from "@gnd/pdf/sales-v2";
import { getPrintDocumentData } from "@gnd/sales/print";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { type TaskName, attachSignedDispatchPdfSchema } from "../../schema";

function createStoredDocumentRepository(): StoredDocumentRepository {
	type FindCurrentByOwnerInput = {
		ownerType: string;
		ownerId: string;
		kind: string;
	};
	type ClearCurrentByOwnerInput = FindCurrentByOwnerInput & {
		excludeId?: string;
	};

	return {
		create(input: CreateStoredDocumentRecordInput) {
			return db.storedDocument.create({
				data: input,
			});
		},
		update(input: UpdateStoredDocumentRecordInput) {
			const { id, ...data } = input;
			return db.storedDocument.update({
				where: { id },
				data,
			});
		},
		findCurrentByOwner(input: FindCurrentByOwnerInput) {
			return db.storedDocument.findFirst({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
				},
			});
		},
		async clearCurrentByOwner(input: ClearCurrentByOwnerInput) {
			await db.storedDocument.updateMany({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
					...(input.excludeId ? { id: { not: input.excludeId } } : {}),
				},
				data: {
					isCurrent: false,
				},
			});
		},
	};
}

async function resolveCompletionActivityIds(input: {
	dispatchId: number;
	notificationId?: number | null;
	notificationIds?: number[] | null;
}) {
	const explicitIds = Array.from(
		new Set(
			[
				...(input.notificationIds || []),
				...(input.notificationId ? [input.notificationId] : []),
			].filter((value): value is number => Number.isFinite(value)),
		),
	);

	if (explicitIds.length) {
		return explicitIds;
	}

	const activities = await db.notePad.findMany({
		where: {
			deletedAt: null,
			AND: [
				{
					tags: {
						some: {
							tagName: "channel",
							tagValue: "sales_dispatch_completed",
						},
					},
				},
				{
					tags: {
						some: {
							tagName: "dispatchId",
							tagValue: String(input.dispatchId),
						},
					},
				},
			],
		},
		select: {
			id: true,
		},
	});

	return activities.map((activity) => activity.id);
}

export const attachSignedDispatchPdf = schemaTask({
	id: "attach-signed-dispatch-pdf" as TaskName,
	schema: attachSignedDispatchPdfSchema,
	machine: "medium-1x",
	maxDuration: 300,
	run: async (payload) => {
		const dispatch = await db.orderDelivery.findFirst({
			where: {
				id: payload.dispatchId,
				deletedAt: null,
			},
			select: {
				id: true,
				status: true,
			},
		});

		if (!dispatch || dispatch.status !== "completed") {
			logger.warn(
				"Skipping signed dispatch PDF generation: dispatch not completed",
				{
					dispatchId: payload.dispatchId,
					salesId: payload.salesId,
				},
			);
			return {
				ok: false,
				reason: "dispatch_not_completed",
			};
		}

		const documentData = await getPrintDocumentData(db, {
			ids: [payload.salesId],
			mode: "packing-slip",
			dispatchId: payload.dispatchId,
		});

		if (!documentData.pages.length) {
			throw new Error(
				`No printable pages found for sales ${payload.salesId} / dispatch ${payload.dispatchId}`,
			);
		}

		const buffer = await renderSalesPdfBuffer({
			pages: documentData.pages,
			title: documentData.title,
			templateId: payload.templateId,
			companyAddress: documentData.companyAddress,
			baseUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
		});

		const filename = `${documentData.title || `dispatch-${payload.dispatchId}`}.pdf`;
		const folder = buildOwnerDocumentFolder({
			ownerType: "dispatch",
			ownerId: String(payload.dispatchId),
			kind: "sales_pdf",
		});
		const documentService = createDocumentService(
			createVercelBlobProvider({
				put,
				token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
				access: "public",
				addRandomSuffix: false,
			}),
		);
		const uploaded = await documentService.upload({
			filename,
			folder,
			body: buffer,
			contentType: "application/pdf",
		});

		const registry = createDocumentRegistry(createStoredDocumentRepository());
		const storedDocument = await registry.registerUploaded({
			ownerType: "dispatch",
			ownerId: String(payload.dispatchId),
			ownerKey: String(payload.salesId),
			kind: "sales_pdf",
			upload: uploaded,
			visibility: "public",
			generated: true,
			sourceType: "sales_dispatch_completed",
			sourceId: payload.notificationId
				? String(payload.notificationId)
				: String(payload.dispatchId),
			uploadedBy: payload.authorId ?? null,
			title: `Signed packing slip ${payload.dispatchId}`,
			description: `Signed packing slip PDF for dispatch ${payload.dispatchId}.`,
			meta: {
				dispatchId: payload.dispatchId,
				salesId: payload.salesId,
			},
		});

		const activityIds = await resolveCompletionActivityIds({
			dispatchId: payload.dispatchId,
			notificationId: payload.notificationId,
			notificationIds: payload.notificationIds,
		});

		for (const activityId of activityIds) {
			await appendActivityTags(db, activityId, {
				attachment: [storedDocument.pathname],
			});
		}

		logger.info("Attached signed dispatch PDF to completion activity", {
			dispatchId: payload.dispatchId,
			salesId: payload.salesId,
			notificationIds: activityIds,
			pathname: storedDocument.pathname,
			documentId: storedDocument.id,
		});

		return {
			ok: true,
			dispatchId: payload.dispatchId,
			salesId: payload.salesId,
			notificationIds: activityIds,
			pathname: storedDocument.pathname,
			documentId: storedDocument.id,
		};
	},
});
