import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconKeys } from "@/components/ui/icon";
import { Text, View } from "react-native";
import { JOB_ALERT_CONFIG, type JobAlertType } from "./config";

type JobAlertViewProps = {
	alert: JobAlertType;
	jobId: number;
	onGoHome: () => void;
	onOpenJobs: () => void;
	onSubmitNewJob: () => void;
	onAssignNewJob: () => void;
	onViewJob: () => void;
};

function toneClasses(alert: JobAlertType) {
	const tone = JOB_ALERT_CONFIG[alert].tone;
	if (tone === "danger") {
		return {
			card: "border-destructive/30 bg-destructive/10",
			badge: "bg-destructive/20",
			badgeText: "text-destructive",
			icon: "TriangleAlert" as IconKeys,
		};
	}
	if (tone === "info") {
		return {
			card: "border-primary/30 bg-primary/10",
			badge: "bg-primary/20",
			badgeText: "text-primary",
			icon: "Info" as IconKeys,
		};
	}
	return {
		card: "border-primary/30 bg-primary/10",
		badge: "bg-primary/20",
		badgeText: "text-primary",
		icon: "CheckCircle2" as IconKeys,
	};
}

export function JobAlertView({
	alert,
	jobId,
	onGoHome,
	onOpenJobs,
	onSubmitNewJob,
	onAssignNewJob,
	onViewJob,
}: JobAlertViewProps) {
	const config = JOB_ALERT_CONFIG[alert];
	const tone = toneClasses(alert);
	const showSubmitNewJob = alert === "submitted";
	const showAssignNewJob = alert === "assigned" || alert === "re-assigned";

	return (
		<View className="flex-1 justify-between bg-background px-5 pb-6 pt-10">
			<View className="items-center">
				<View
					className={`h-20 w-20 items-center justify-center rounded-full border border-border ${tone.badge}`}
				>
					<Icon name={tone.icon} className={tone.badgeText} size={30} />
				</View>
				<Text
					className={`mt-5 text-center text-xs uppercase tracking-[1.2px] ${tone.badgeText}`}
				>
					{config.subtitle}
				</Text>
				<Text className="mt-1 text-center text-3xl font-black text-foreground">
					{config.title}
				</Text>
				<Text className="mt-3 px-1 text-center text-base leading-6 text-muted-foreground">
					{config.description}
				</Text>
			</View>

			<View className={`border-y border-border py-6 ${tone.card}`}>
				<View className="flex-row items-center justify-between px-2">
					<Text className="text-sm font-semibold text-muted-foreground">
						Reference
					</Text>
					<Text className="text-sm font-black text-foreground">
						Job #{jobId}
					</Text>
				</View>
			</View>

			<View className="gap-3">
				{(showSubmitNewJob || showAssignNewJob) && (
					<Button
						onPress={showSubmitNewJob ? onSubmitNewJob : onAssignNewJob}
						className="h-12 rounded-2xl bg-primary"
					>
						<Icon name="Plus" className="text-primary-foreground" size={16} />
						<Text className="text-primary-foreground">
							{showSubmitNewJob ? "Submit New Job" : "Assign New Job"}
						</Text>
					</Button>
				)}

				<Button onPress={onViewJob} className="h-12 rounded-2xl bg-primary">
					<Icon name="Eye" className="text-primary-foreground" size={16} />
					<Text className="text-primary-foreground">View Job</Text>
				</Button>

				<Button
					onPress={onOpenJobs}
					variant="outline"
					className="h-12 rounded-2xl border-border bg-background"
				>
					<Icon name="List" className="text-foreground" size={16} />
					<Text className="text-foreground">Open Jobs</Text>
				</Button>

				<Button
					onPress={onGoHome}
					variant="outline"
					className="h-12 rounded-2xl border-border bg-background"
				>
					<Icon name="House" className="text-foreground" size={16} />
					<Text className="text-foreground">Go Back Home</Text>
				</Button>
			</View>
		</View>
	);
}
