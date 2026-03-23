import { getMyInsuranceStatus } from "@/app-deps/(v1)/_actions/hrm-jobs/get-insurance-status";
import { InsuranceWarningBanner } from "@/app-deps/(v2)/(loggedIn)/contractors/_components/insurance-warning-banner";

export default async function SalesLayout({ children }) {
	const insuranceStatus = await getMyInsuranceStatus();

	return (
		<div className="space-y-4 px-8 lg:px-16">
			<InsuranceWarningBanner status={insuranceStatus} />
			{children}
		</div>
	);
}
