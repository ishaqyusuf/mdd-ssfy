import { useJobFormParams } from "@/hooks/use-job-form-params";
import { CustomModal } from "../custom-modal";
import { StepsDescription } from "./steps-description";
import { NewJobFooter } from "./new-job-footer";
import { Tabs } from "@gnd/ui/composite";
import { useJobStepInfo } from "@/hooks/use-job-step-info";
import { UserSelectStep } from "./user-select-step";
import { ProjectSelectStep } from "./project-select-step";
import { UnitSelectStep } from "./unit-select-step";
import { TaskSelectStep } from "./task-select-step";
import { FormStep } from "./form-step";
import {
    JobFormProvider,
    useCreateJobFormContext,
} from "@/contexts/job-form-context";

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
                <>
                    <span>Assign New Job</span>
                    <span id="step-title" />
                </>
            }
            description={<StepsDescription />}
            size={"xl"}
        >
            <JobFormProvider value={jobFormContext}>
                <div className="" id="sub-header"></div>
                <CustomModal.Content className="max-h-[60vh] min-h-[60vh]  relative -mx-0">
                    <Tabs value={String(params.step)}>
                        {stepTabs.map((StepComponent, index) => (
                            <Tabs.Content key={index} value={String(index + 1)}>
                                <StepComponent />
                            </Tabs.Content>
                        ))}
                        {/* {formType === "assign" ? (
                        <>
                            <Tabs.Content value={"1"}>
                                <UserSelectStep />
                               
                            </Tabs.Content>
                            <Tabs.Content value={"2"}>
                                <ProjectSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"3"}>
                                <UnitSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"4"}>
                                <TaskSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"5"}>
                                <FormStep />
                            </Tabs.Content>
                        </>
                    ) : (
                        <>
                            <Tabs.Content value={"1"}>
                                <ProjectSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"2"}>
                                <UnitSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"3"}>
                                <TaskSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"4"}>
                                <FormStep />
                            </Tabs.Content>
                        </>
                    )} */}
                    </Tabs>

                    <NewJobFooter />
                </CustomModal.Content>
            </JobFormProvider>
        </CustomModal>
    );
}

