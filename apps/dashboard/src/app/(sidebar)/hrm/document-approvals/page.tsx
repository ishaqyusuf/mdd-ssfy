import PageShell from "@/components/page-shell";
import { ScrollableContent } from "@/components/scrollable-content";
import { getInitialTableSettings } from "@/utils/columns";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { constructMetadata } from "@gnd/utils/construct-metadata";

import { getEmployeeDocumentApprovals } from "./_actions/get-employee-document-approvals";
import { DocumentApprovalList } from "./document-approval-list";

export async function generateMetadata() {
	return constructMetadata({
		title: "Document Approvals | GND",
	});
}

export default async function DocumentApprovalsPage() {
	const [documents, initialSettings] = await Promise.all([
		getEmployeeDocumentApprovals(),
		getInitialTableSettings("document-approvals"),
	]);

	return (
		<PageShell className="h-[calc(100vh-var(--header-height))] overflow-hidden">
			<ScrollableContent>
				<div className="flex flex-col gap-6 pt-6">
					<PageTitle>Document Approvals</PageTitle>
					<DocumentApprovalList
						documents={documents}
						initialSettings={initialSettings}
					/>
				</div>
			</ScrollableContent>
		</PageShell>
	);
}
