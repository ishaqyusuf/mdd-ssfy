import type { Db } from "@gnd/db";
import { getSpecialOrderStatusLabel } from "../../special-order/domain";
import type { PrintSalesData } from "../query";
import type { PrintMode, PrintSpecialOrderData } from "../types";

export async function composeSpecialOrderPrintData(
	db: Db,
	sale: PrintSalesData,
	mode: PrintMode,
): Promise<PrintSpecialOrderData | null> {
	if (sale.specialOrderDeclaration !== "YES" || mode === "quote") return null;
	const rawStatus = sale.specialOrderStatus || "SIGNATURE_PENDING";
	const status: PrintSpecialOrderData["status"] = [
		"CUSTOMER_APPROVED",
		"REAPPROVAL_REQUIRED",
		"CUSTOMER_DECLINED",
	].includes(rawStatus)
		? (rawStatus as PrintSpecialOrderData["status"])
		: "SIGNATURE_PENDING";
	const customerDocument = mode === "invoice";
	const [evidence, request] = await Promise.all([
		sale.currentSpecialOrderApprovalId
			? db.specialOrderApprovalEvidence.findUnique({
					where: { id: sale.currentSpecialOrderApprovalId },
				})
			: null,
		sale.currentSpecialOrderRequestId
			? db.specialOrderApprovalRequest.findUnique({
					where: { id: sale.currentSpecialOrderRequestId },
					include: {
						policyVersion: true,
						evidence: true,
					},
				})
			: null,
	]);
	const contextualEvidence = evidence || request?.evidence || null;
	const policy = contextualEvidence
		? {
				title: contextualEvidence.policyTitle,
				policyText: contextualEvidence.policyText,
				acknowledgmentText: contextualEvidence.acknowledgmentText,
				version: request?.policyVersion.version ?? null,
			}
		: request?.policyVersion
			? {
					title: request.policyVersion.title,
					policyText: request.policyVersion.policyText,
					acknowledgmentText: request.policyVersion.acknowledgmentText,
					version: request.policyVersion.version,
				}
			: await db.specialOrderPolicyVersion
					.findFirst({
						where: { status: "PUBLISHED" },
						orderBy: { version: "desc" },
					})
					.then((latest) =>
						latest
							? {
									title: latest.title,
									policyText: latest.policyText,
									acknowledgmentText: latest.acknowledgmentText,
									version: latest.version,
								}
							: null,
					);
	const signature =
		customerDocument && contextualEvidence?.signatureDocumentId
			? await db.storedDocument.findFirst({
					where: {
						id: contextualEvidence.signatureDocumentId,
						visibility: "private",
						status: "ready",
					},
					select: { url: true },
				})
			: null;

	return {
		status,
		label: getSpecialOrderStatusLabel({ declaration: "YES", status }),
		compact: !customerDocument,
		policyTitle: customerDocument ? policy?.title || null : null,
		policyText: customerDocument ? policy?.policyText || null : null,
		acknowledgmentText: customerDocument
			? policy?.acknowledgmentText || null
			: null,
		policyVersion: customerDocument ? policy?.version || null : null,
		signerName:
			customerDocument && status === "CUSTOMER_APPROVED"
				? contextualEvidence?.customerName || null
				: null,
		approvedAt:
			customerDocument && status === "CUSTOMER_APPROVED"
				? contextualEvidence?.acknowledgedAt.toISOString() || null
				: null,
		signatureUrl:
			customerDocument && status === "CUSTOMER_APPROVED"
				? signature?.url || null
				: null,
	};
}
