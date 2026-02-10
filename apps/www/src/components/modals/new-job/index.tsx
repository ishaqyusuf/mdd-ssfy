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

export function NewJobModal() {
    const { setParams, opened, ...params } = useJobFormParams();
    const { formType } = useJobStepInfo();

    const stepTabs =
        formType === "assign"
            ? [
                  UserSelectStep,
                  ProjectSelectStep,
                  UnitSelectStep,
                  TaskSelectStep,
                  FormStep,
              ]
            : [ProjectSelectStep, UnitSelectStep, TaskSelectStep, FormStep];
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
            <div className="" id="sub-header"></div>
            <CustomModal.Content className="h-[70vh] relative -mx-0">
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
        </CustomModal>
    );
}

