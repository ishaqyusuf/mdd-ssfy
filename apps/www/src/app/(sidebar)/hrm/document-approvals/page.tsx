import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import { getEmployeeDocumentApprovals } from "./_actions/get-employee-document-approvals";
import { DocumentApprovalList } from "./document-approval-list";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Document Approvals | GND",
	});
}

export default async function DocumentApprovalsPage() {
	const documents = await getEmployeeDocumentApprovals();

	return (
		<PageShell>
			<div className="flex flex-col gap-6 pt-6">
				<PageTitle>Document Approvals</PageTitle>
				<DocumentApprovalList documents={documents} />
			</div>
		</PageShell>
	);
}
