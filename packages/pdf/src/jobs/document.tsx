import { JobsPayrollPdfDocument } from "./payroll/document";
import { JobsSelectionPdfDocument } from "./selection/document";
import type { JobsPrintData } from "./shared/types";

export function JobsPdfDocument({
	data,
	baseUrl,
	title,
}: {
	data: JobsPrintData;
	baseUrl?: string;
	title?: string;
}) {
	if (data.context === "payroll-report" && data.payroll) {
		return (
			<JobsPayrollPdfDocument data={data} baseUrl={baseUrl} title={title} />
		);
	}

	return (
		<JobsSelectionPdfDocument data={data} baseUrl={baseUrl} title={title} />
	);
}
