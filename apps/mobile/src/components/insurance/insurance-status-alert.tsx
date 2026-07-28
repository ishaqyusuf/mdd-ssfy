import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import type { InsuranceRequirement } from "@gnd/utils/insurance-documents";
import { ShieldCheck, TriangleAlert } from "lucide-react-native";
import { Text, View } from "react-native";

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

function getAlertTone(status: InsuranceRequirement["state"]) {
	switch (status) {
		case "valid":
			return {
				title: "Insurance approved",
				icon: ShieldCheck,
				className: "border-emerald-200 bg-emerald-50",
				iconClassName: "text-emerald-600",
			};
		case "expiring_soon":
			return {
				title: "Insurance expiring soon",
				icon: TriangleAlert,
				className: "border-amber-200 bg-amber-50",
				iconClassName: "text-amber-600",
			};
		default:
			return {
				title: "Insurance required",
				icon: TriangleAlert,
				className: "border-destructive/25 bg-destructive/10",
				iconClassName: "text-destructive",
			};
	}
}

export function getFallbackInsuranceStatus(): InsuranceRequirement {
	return {
		blocking: true,
		expiresAt: null,
		message: "Upload your insurance document before submitting a new job.",
		state: "missing",
	};
}

type Props = {
	status: InsuranceRequirement;
	className?: string;
	showWhenValid?: boolean;
	ctaLabel?: string;
	onPress?: () => void;
};

export function InsuranceStatusAlert({
	status,
	className,
	showWhenValid = false,
	ctaLabel,
	onPress,
}: Props) {
	if (status.state === "valid" && !showWhenValid) return null;

	const tone = getAlertTone(status.state);
	const expiryLabel = formatExpiry(status.expiresAt);

	return (
		<Alert
			icon={tone.icon}
			className={cn("rounded-2xl border px-4 py-4", tone.className, className)}
			iconClassName={tone.iconClassName}
		>
			<AlertTitle className="text-foreground">{tone.title}</AlertTitle>
			<AlertDescription className="text-muted-foreground">
				{status.message}
			</AlertDescription>
			{expiryLabel ? (
				<View className="mt-2 flex-row items-center gap-2 pl-6">
					<Icon
						name="Calendar"
						className="size-4 text-muted-foreground"
						size={16}
					/>
					<Text className="text-xs text-muted-foreground">
						Expiry date: {expiryLabel}
					</Text>
				</View>
			) : null}
			{ctaLabel && onPress ? (
				<View className="mt-3 pl-6">
					<Button
						variant={status.blocking ? "default" : "outline"}
						size="sm"
						onPress={onPress}
						className="self-start rounded-xl"
					>
						<Text>{ctaLabel}</Text>
					</Button>
				</View>
			) : null}
		</Alert>
	);
}
