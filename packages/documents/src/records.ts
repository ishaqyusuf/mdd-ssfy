import type { DocumentUploadResult } from "./types";

export const documentKinds = [
	"sales_pdf",
	"gallery_image",
	"dispatch_image",
	"signature",
	"attachment",
] as const;

export const documentOwnerTypes = [
	"sales_order",
	"sales_gallery",
	"dispatch",
	"signature_capture",
	"user",
] as const;

export const documentStatuses = [
	"pending",
	"ready",
	"stale",
	"failed",
	"deleted",
] as const;

export const documentVisibilities = [
	"private",
	"public",
	"token-protected",
] as const;

export type DocumentKind = (typeof documentKinds)[number] | (string & {});
export type DocumentOwnerType =
	| (typeof documentOwnerTypes)[number]
	| (string & {});
export type DocumentStatus = (typeof documentStatuses)[number] | (string & {});
export type DocumentVisibility =
	| (typeof documentVisibilities)[number]
	| (string & {});

export type DocumentOwnerReference = {
	ownerType: DocumentOwnerType;
	ownerId: string;
	ownerKey?: string | null;
};

export type StoredDocumentRecord = DocumentOwnerReference & {
	id: string;
	kind: DocumentKind;
	provider: string;
	pathname: string;
	url?: string | null;
	filename?: string | null;
	mimeType?: string | null;
	extension?: string | null;
	size?: number | null;
	checksum?: string | null;
	status: DocumentStatus;
	visibility: DocumentVisibility;
	isCurrent: boolean;
	generated: boolean;
	sourceType?: string | null;
	sourceId?: string | null;
	uploadedBy?: number | null;
	title?: string | null;
	description?: string | null;
	meta?: Record<string, unknown> | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	deletedAt?: Date | null;
};

export type CreateStoredDocumentRecordInput = DocumentOwnerReference & {
	id?: string;
	kind: DocumentKind;
	provider: string;
	pathname: string;
	url?: string | null;
	filename?: string | null;
	mimeType?: string | null;
	extension?: string | null;
	size?: number | null;
	checksum?: string | null;
	status?: DocumentStatus;
	visibility?: DocumentVisibility;
	isCurrent?: boolean;
	generated?: boolean;
	sourceType?: string | null;
	sourceId?: string | null;
	uploadedBy?: number | null;
	title?: string | null;
	description?: string | null;
	meta?: Record<string, unknown> | null;
};

export type UpdateStoredDocumentRecordInput = {
	id: string;
	status?: DocumentStatus;
	isCurrent?: boolean;
	deletedAt?: Date | null;
	url?: string | null;
	pathname?: string;
	size?: number | null;
	checksum?: string | null;
	meta?: Record<string, unknown> | null;
};

export type StoredDocumentRepository = {
	create(input: CreateStoredDocumentRecordInput): Promise<StoredDocumentRecord>;
	update(input: UpdateStoredDocumentRecordInput): Promise<StoredDocumentRecord>;
	findCurrentByOwner(input: {
		ownerType: DocumentOwnerType;
		ownerId: string;
		kind: DocumentKind;
	}): Promise<StoredDocumentRecord | null>;
	clearCurrentByOwner?(input: {
		ownerType: DocumentOwnerType;
		ownerId: string;
		kind: DocumentKind;
		excludeId?: string;
	}): Promise<void>;
};

export type CreateStoredDocumentFromUploadInput = DocumentOwnerReference & {
	kind: DocumentKind;
	upload: DocumentUploadResult;
	visibility?: DocumentVisibility;
	isCurrent?: boolean;
	generated?: boolean;
	sourceType?: string | null;
	sourceId?: string | null;
	uploadedBy?: number | null;
	title?: string | null;
	description?: string | null;
	meta?: Record<string, unknown> | null;
};
