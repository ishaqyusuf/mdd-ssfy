import { useAuth } from "./use-auth";

export function useJobStepInfo() {
    const auth = useAuth();

    const formType = auth?.can?.editJobs ? "assign" : "submit";
    return {
        formType,
        stepCount: formType === "assign" ? 5 : 4,
    };
}

