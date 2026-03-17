export const salesDocumentTypes = [
	"invoice_pdf",
	"quote_pdf",
	"packing_slip_pdf",
	"production_pdf",
] as const;

export const salesDocumentStatuses = [
	"pending",
	"ready",
	"stale",
	"failed",
] as const;

export const salesDocumentReasons = [
	"invoice_updated",
	"payment_recorded",
	"payment_refunded",
	"manual_regeneration",
	"backfill",
] as const;

export type SalesDocumentType =
	| (typeof salesDocumentTypes)[number]
	| (string & {});
export type SalesDocumentStatus =
	| (typeof salesDocumentStatuses)[number]
	| (string & {});
export type SalesDocumentReason =
	| (typeof salesDocumentReasons)[number]
	| (string & {});

export type SalesDocumentSnapshotRecord = {
	id: string;
	salesOrderId: number;
	storedDocumentId?: string | null;
	documentType: SalesDocumentType;
	version: number;
	generationStatus: SalesDocumentStatus;
	reason?: SalesDocumentReason | null;
	isCurrent: boolean;
	sourceUpdatedAt?: Date | null;
	generatedAt?: Date | null;
	invalidatedAt?: Date | null;
	failedAt?: Date | null;
	errorMessage?: string | null;
	meta?: Record<string, unknown> | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	deletedAt?: Date | null;
};

export type CreateSalesDocumentSnapshotInput = {
	id?: string;
	salesOrderId: number;
	storedDocumentId?: string | null;
	documentType: SalesDocumentType;
	version: number;
	generationStatus?: SalesDocumentStatus;
	reason?: SalesDocumentReason | null;
	isCurrent?: boolean;
	sourceUpdatedAt?: Date | null;
	generatedAt?: Date | null;
	invalidatedAt?: Date | null;
	failedAt?: Date | null;
	errorMessage?: string | null;
	meta?: Record<string, unknown> | null;
};

export type UpdateSalesDocumentSnapshotInput = {
	id: string;
	storedDocumentId?: string | null;
	generationStatus?: SalesDocumentStatus;
	reason?: SalesDocumentReason | null;
	isCurrent?: boolean;
	generatedAt?: Date | null;
	invalidatedAt?: Date | null;
	failedAt?: Date | null;
	errorMessage?: string | null;
	meta?: Record<string, unknown> | null;
};

export type SalesDocumentSnapshotRepository = {
	create(
		input: CreateSalesDocumentSnapshotInput,
	): Promise<SalesDocumentSnapshotRecord>;
	update(
		input: UpdateSalesDocumentSnapshotInput,
	): Promise<SalesDocumentSnapshotRecord>;
	findCurrentByType(input: {
		salesOrderId: number;
		documentType: SalesDocumentType;
	}): Promise<SalesDocumentSnapshotRecord | null>;
	findLatestVersion(input: {
		salesOrderId: number;
		documentType: SalesDocumentType;
	}): Promise<SalesDocumentSnapshotRecord | null>;
	clearCurrentByType?(input: {
		salesOrderId: number;
		documentType: SalesDocumentType;
		excludeId?: string;
	}): Promise<void>;
};
