import ContractorAccountingAlertEmail, {
	type ContractorAccountingAlertEmailProps,
} from "./emails/contractor-accounting-alert";
import ContractorAccountingReportReadyEmail, {
	type ContractorAccountingReportReadyEmailProps,
} from "./emails/contractor-accounting-report-ready";
/** @jsxImportSource react */
import { render } from "./render";

export function renderContractorAccountingAlertEmail(
	props: ContractorAccountingAlertEmailProps,
) {
	return render(<ContractorAccountingAlertEmail {...props} />);
}

export function renderContractorAccountingReportReadyEmail(
	props: ContractorAccountingReportReadyEmailProps,
) {
	return render(<ContractorAccountingReportReadyEmail {...props} />);
}
