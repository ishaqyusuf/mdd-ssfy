import type { ContractorPeriodReport } from "@gnd/contractor-accounting";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractorAccountingPdfDocument } from "./document";

export function renderContractorAccountingPdfBuffer(
	report: ContractorPeriodReport,
	options?: { baseUrl?: string },
) {
	return renderToBuffer(
		<ContractorAccountingPdfDocument
			report={report}
			baseUrl={options?.baseUrl}
		/>,
	);
}
