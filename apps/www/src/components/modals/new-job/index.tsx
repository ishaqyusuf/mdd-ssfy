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
		stepTabs[
			Math.max(0, Math.min(stepTabs.length - 1, (params.step || 1) - 1))
		];
	return (
		<CustomModal
			className="fixed inset-0 left-0 top-0 h-[100dvh] max-h-none w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 sm:max-w-none md:inset-auto md:left-[50%] md:top-[50%] md:h-auto md:w-full md:max-w-xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-lg md:border"
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
				<CustomModal.Content className="relative -mx-0 max-h-none min-h-0 flex-1 md:max-h-[60vh] md:min-h-[60vh]">
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
