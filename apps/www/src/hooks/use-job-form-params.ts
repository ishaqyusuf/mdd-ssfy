import {
    parseAsBoolean,
    parseAsInteger,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";

export function useJobFormParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        step: parseAsStringEnum(["user", "project", "unit", "task", "form"]),
        projectId: parseAsInteger,
        jobId: parseAsInteger,
        unitId: parseAsInteger,
        taskId: parseAsInteger,
        userId: parseAsInteger,
    });
    const opened = !!params.step;
    return {
        ...params,
        setParams,
        opened,
    };
}

