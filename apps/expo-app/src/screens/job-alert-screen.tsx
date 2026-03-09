import { normalizeJobAlert } from "@/components/job-alert/config";
import { JobAlertView } from "@/components/job-alert/job-alert-view";
import { SafeArea } from "@/components/safe-area";
import { useAuthContext } from "@/hooks/use-auth";
import { type Href, useRouter } from "expo-router";

type JobAlertScreenProps = {
	jobId: number;
	alert: string;
};

export function JobAlertScreen({ jobId, alert }: JobAlertScreenProps) {
	const router = useRouter();
	const auth = useAuthContext();
	const resolvedAlert = normalizeJobAlert(alert);
	const jobsHref: Href = "/jobs";
	const jobFormHref = "/job-form";
	const sectionHomeHref: Href =
		auth.currentSectionKey === "dispatch" || auth.currentSectionKey === "driver"
			? "/dispatch"
			: auth.currentSectionKey === "sales"
				? "/"
				: "/dashboard";

	return (
		<SafeArea>
			<JobAlertView
				alert={resolvedAlert}
				jobId={jobId}
				onViewJob={() =>
					router.replace({
						pathname: "/job/[id]",
						params: { id: String(jobId) },
					})
				}
				onOpenJobs={() => router.replace(jobsHref)}
				onSubmitNewJob={() =>
					router.replace({
						pathname: jobFormHref,
						params: { action: "submit", admin: "false" },
					})
				}
				onAssignNewJob={() =>
					router.replace({
						pathname: jobFormHref,
						params: { action: "submit", admin: "true" },
					})
				}
				onGoHome={() => router.replace(sectionHomeHref)}
			/>
		</SafeArea>
	);
}
