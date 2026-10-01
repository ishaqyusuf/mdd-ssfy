import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { SheetContent } from "@gnd/ui/sheet";
import { FormStep } from "./form-step";
import { JobSheetHeader } from "./job-sheet-header";
import { NewJobFooter } from "./new-job-footer";
import { ProjectSelectStep } from "./project-select-step";
import { TaskSelectStep } from "./task-select-step";
import { UnitSelectStep } from "./unit-select-step";
import { UserSelectStep } from "./user-select-step";

export function JobSheetContent() {
	const { step } = useJobFormParams();
	const { formType } = useJobStepInfo();
	const steps =
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
		steps[Math.max(0, Math.min(steps.length - 1, (step || 1) - 1))];
	return (
		<SheetContent
			className="flex h-[100dvh] w-screen max-w-none flex-col gap-0 p-0 sm:max-w-[640px]"
			onOpenAutoFocus={(event) => {
				event.preventDefault();
				document.querySelector<HTMLElement>("[data-job-sheet-title]")?.focus();
			}}
		>
			<JobSheetHeader />
			<div id="sub-header" className="shrink-0 px-5 pb-3" />
			<div className="min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-hidden overflow-y-auto px-5 pb-5">
				<ActiveStep />
			</div>
			<NewJobFooter />
		</SheetContent>
	);
}
