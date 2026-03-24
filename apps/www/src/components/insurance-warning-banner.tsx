import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import type { InsuranceRequirement } from "@gnd/utils/insurance-documents";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

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

function formatExpiry(expiresAt?: string | null) {
	if (!expiresAt) return null;
	const date = new Date(expiresAt);

	if (Number.isNaN(date.getTime())) return null;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

type Props = {
	status: InsuranceRequirement;
	className?: string;
	showWhenValid?: boolean;
	ctaHref?: string;
	ctaLabel?: string;
};

export function InsuranceWarningBanner({
	status,
	className,
	showWhenValid = false,
	ctaHref = "/settings/profile",
	ctaLabel = "Manage documents",
}: Props) {
	if (status.state === "valid" && !showWhenValid) {
		return null;
	}

	const banner = getBannerStyles(status.state);
	const Icon = banner.icon;
	const expiry = formatExpiry(status.expiresAt);

	return (
		<Alert className={cn("gap-4", banner.className, className)}>
			<Icon className="h-4 w-4" />
			<div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-1">
					<AlertTitle>{banner.title}</AlertTitle>
					<AlertDescription className="space-y-1">
						<p>{status.message}</p>
						{expiry ? <p>Expiry date: {expiry}</p> : null}
					</AlertDescription>
				</div>
				{ctaHref ? (
					<Button
						asChild
						size="sm"
						variant={status.blocking ? "default" : "outline"}
					>
						<Link href={ctaHref}>{ctaLabel}</Link>
					</Button>
				) : null}
			</div>
		</Alert>
	);
}
