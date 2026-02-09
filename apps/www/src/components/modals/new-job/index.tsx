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

export function NewJobModal() {
    const { setParams, opened, ...params } = useJobFormParams();
    const { formType } = useJobStepInfo();
    return (
        <CustomModal
            className=""
            open={opened}
            onOpenChange={(open) => {
                if (!open) {
                    setParams(null);
                }
            }}
            title={"Assign New Job"}
            description={<StepsDescription />}
            size={"xl"}
        >
            <CustomModal.Content className="h-[60vh] relative -mx-0">
                <Tabs value={String(params.step)}>
                    {formType === "assign" ? (
                        <>
                            <Tabs.Content value={"1"}>
                                <UserSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"2"}>
                                <ProjectSelectStep stepIndex={2} />
                            </Tabs.Content>
                            <Tabs.Content value={"3"}>
                                <UnitSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"4"}>
                                <TaskSelectStep />
                            </Tabs.Content>
                        </>
                    ) : (
                        <>
                            <Tabs.Content value={"1"}>
                                <ProjectSelectStep stepIndex={1} />
                            </Tabs.Content>
                            <Tabs.Content value={"2"}>
                                <UnitSelectStep />
                            </Tabs.Content>
                            <Tabs.Content value={"3"}>
                                <TaskSelectStep />
                            </Tabs.Content>
                        </>
                    )}
                </Tabs>

                <NewJobFooter />
            </CustomModal.Content>
        </CustomModal>
    );
}

