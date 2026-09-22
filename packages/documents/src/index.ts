export type {
	DocumentDeleteInput,
	DocumentDeleteResult,
	DocumentFolder,
	DocumentProvider,
	DocumentProviderName,
	DocumentUploadInput,
	DocumentUploadResult,
} from "./types";

export type { DocumentService } from "./service";
export { createDocumentService } from "./service";
export { normalizePathname, withFolder } from "./utils";
export type {
	CreateStoredDocumentFromUploadInput,
	CreateStoredDocumentRecordInput,
	DocumentKind,
	DocumentOwnerReference,
	DocumentOwnerType,
	DocumentStatus,
	DocumentVisibility,
	StoredDocumentRecord,
	StoredDocumentRepository,
	UpdateStoredDocumentRecordInput,
} from "./records";
export {
	documentKinds,
	documentOwnerTypes,
	documentStatuses,
	documentVisibilities,
} from "./records";
export {
	buildOwnerDocumentFolder,
	createDocumentRegistry,
	createStoredDocumentRecordInput,
} from "./registry";

export type { CloudinaryProviderOptions } from "./providers/cloudinary";
export { createCloudinaryProvider } from "./providers/cloudinary";

export type {
	VercelBlobProviderOptions,
	VercelBlobPutResult,
} from "./providers/vercel-blob";
export { createVercelBlobProvider } from "./providers/vercel-blob";

export {
	EMPLOYEE_DOCUMENT_KIND,
	EMPLOYEE_DOCUMENT_OWNER_TYPE,
	EMPLOYEE_DOCUMENT_PRIVATE_ACCESS,
	EMPLOYEE_DOCUMENT_WORKFLOW,
	canAccessEmployeeDocument,
	classifyLegacyEmployeeDocumentSource,
	employeeDocumentAccessPath,
	isPrivateEmployeeDocumentMeta,
	parseEmployeeStoredDocumentId,
	trustedLegacyEmployeeDocumentUrl,
	trustedLegacyEmployeeDocumentUrlFromRecord,
} from "./employee-document";
export type {
	EmployeeDocumentAccessInput,
	LegacyEmployeeDocumentSourceClassification,
} from "./employee-document";
