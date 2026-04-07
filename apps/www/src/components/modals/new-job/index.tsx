import {
	JobFormProvider,
	useCreateJobFormContext,
} from "@/contexts/job-form-context";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { Tabs } from "@gnd/ui/namespace";
import { CustomModal } from "../custom-modal";
import { FormStep } from "./form-step";
import { NewJobFooter } from "./new-job-footer";
import { ProjectSelectStep } from "./project-select-step";
import { StepsDescription } from "./steps-description";
import { TaskSelectStep } from "./task-select-step";
import { UnitSelectStep } from "./unit-select-step";
import { UserSelectStep } from "./user-select-step";

export function NewJobModal() {
	const { setParams, opened, ...params } = useJobFormParams();
	const { formType } = useJobStepInfo();
	const jobFormContext = useCreateJobFormContext();
	const stepTabs =
		formType === "assign"
			? [
					UserSelectStep,
					ProjectSelectStep,
					TaskSelectStep,
					UnitSelectStep,
					FormStep,
				]
			: [ProjectSelectStep, TaskSelectStep, UnitSelectStep, FormStep];
	const ActiveStep =
		stepTabs[Math.max(0, Math.min(stepTabs.length - 1, (params.step || 1) - 1))];
	return (
		<CustomModal
			className=""
			open={opened}
			onOpenChange={(open) => {
				if (!open) {
					setParams(null);
				}
			}}
			title={
				<span>
					<span>Assign New Job</span>
					<span id="step-title" />
				</span>
			}
			description={<StepsDescription />}
			size={"xl"}
		>
			<JobFormProvider value={jobFormContext}>
				<div className="" id="sub-header" />
				<CustomModal.Content className="max-h-[60vh] min-h-[60vh]  relative -mx-0">
					<Tabs value={String(params.step)}>
						<Tabs.Content value={String(params.step || 1)}>
							<ActiveStep />
						</Tabs.Content>
					</Tabs>

					<NewJobFooter />
				</CustomModal.Content>
			</JobFormProvider>
		</CustomModal>
	);
}
