import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import type { InsuranceRequirement } from "@gnd/utils/insurance-documents";
import { ShieldAlert, ShieldCheck } from "lucide-react";

function getBannerStyles(status: InsuranceRequirement["state"]) {
	switch (status) {
		case "valid":
			return {
				className: "border-emerald-200 bg-emerald-50 text-emerald-950",
				icon: ShieldCheck,
				title: "Insurance approved",
			};
		case "expiring_soon":
			return {
				className: "border-amber-200 bg-amber-50 text-amber-950",
				icon: ShieldAlert,
				title: "Insurance expiring soon",
			};
		default:
			return {
				className: "border-red-200 bg-red-50 text-red-950",
				icon: ShieldAlert,
				title: "Insurance required",
			};
	}
}

export function InsuranceWarningBanner({
	status,
}: {
	status: InsuranceRequirement;
}) {
	if (status.state === "valid") {
		return null;
	}

	const banner = getBannerStyles(status.state);
	const Icon = banner.icon;

	return (
		<Alert className={banner.className}>
			<Icon className="h-4 w-4" />
			<AlertTitle>{banner.title}</AlertTitle>
			<AlertDescription>{status.message}</AlertDescription>
		</Alert>
	);
}
