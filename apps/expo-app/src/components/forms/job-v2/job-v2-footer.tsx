import { Button } from "@/components/ui/button";
import { InsuranceStatusAlert } from "@/components/insurance/insurance-status-alert";
import { useJobFormV2Context } from "@/hooks/use-job-form-v2";
import { Text, View } from "react-native";
import { NeoCard } from "./ui/neo-card";

function canContinue(tab: string, params: any) {
	if (tab === "user") return !!params.userId;
	if (tab === "project") return !!params.projectId;
	if (tab === "task") return params.builderTaskId !== null;
	if (tab === "unit") return !!params.unitId;
	return true;
}

export function JobV2Footer() {
	const {
		action,
		currentTab,
		prevStep,
		nextStep,
		params,
		handleSubmit,
		isSaving,
		insuranceStatus,
		isInsuranceStatusPending,
		isConfigRequestedStatus,
		hasMissingTaskConfiguration,
		isInstallCostStepActive,
		closeInstallCostStep,
		reset,
	} = useJobFormV2Context();

	// if (currentTab === "form") {
	//   return null;
	// }
	const isForm = currentTab === "form";
	const hideBack = action === "submit" || action === "re-assign";
	const submitDisabled =
		isSaving ||
		isConfigRequestedStatus ||
		isInsuranceStatusPending ||
		!!insuranceStatus?.blocking;
	const submitLabel = isInsuranceStatusPending
		? "Checking insurance..."
		: insuranceStatus?.blocking
			? "Insurance required"
			: isSaving
				? "Submitting..."
				: isConfigRequestedStatus
					? "Waiting Config"
					: "Submit Job";
	return (
		<View className="px-4 pb-4 pt-2">
			{isForm && insuranceStatus ? (
				<InsuranceStatusAlert status={insuranceStatus} className="mb-3" />
			) : null}
			<NeoCard className="flex-row items-center gap-3 rounded-[28px] bg-card p-3">
				{hideBack ? null : (
					<Button
						variant="outline"
						onPress={prevStep}
						className="rounded-2xl px-4"
					>
						<Text className="text-foreground">Back</Text>
					</Button>
				)}

				<View className="flex-1" />

				{!isForm && currentTab !== "completed" && action !== "re-assign" ? (
					<Button
						onPress={nextStep}
						className="rounded-2xl bg-primary px-5"
						disabled={!canContinue(currentTab, params)}
					>
						<Text className="text-primary-foreground">Continue</Text>
					</Button>
				) : null}

				{isForm && isInstallCostStepActive ? (
					<Button
						onPress={closeInstallCostStep}
						className="rounded-2xl bg-primary px-5"
					>
						<Text className="text-primary-foreground">Finish</Text>
					</Button>
				) : null}

				{isForm && !hasMissingTaskConfiguration && !isInstallCostStepActive ? (
					<Button
						onPress={handleSubmit}
						className="rounded-2xl bg-primary px-5"
						disabled={submitDisabled}
					>
						<Text className="text-primary-foreground">{submitLabel}</Text>
					</Button>
				) : null}

				{currentTab === "completed" ? (
					<Button onPress={reset} className="rounded-2xl bg-primary px-5">
						<Text className="text-primary-foreground">Create Another</Text>
					</Button>
				) : null}
			</NeoCard>
		</View>
	);
}
