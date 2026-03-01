import { parseAsInteger, useQueryStates } from "nuqs";

export function useJobFormParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        redirectStep: parseAsInteger,
        step: parseAsInteger,
        _projectId: parseAsInteger,
        _jobId: parseAsInteger,
        _unitId: parseAsInteger,
        _taskId: parseAsInteger,
        _userId: parseAsInteger,
        _modelId: parseAsInteger,
    });
    const opened = !!params.step;
    return {
        ...params,
        projectId: params._projectId,
        jobId: params._jobId,
        unitId: params._unitId,
        taskId: params._taskId,
        userId: params._userId,
        modelId: params._modelId,
        // setParams,
        setParams: (
            newParams: {
                step?: number | null;
                redirectStep?: number | null;
                projectId?: number | null;
                jobId?: number | null;
                unitId?: number | null;
                taskId?: number | null;
                userId?: number | null;
                modelId?: number | null;
            } | null,
        ) => {
            if (!newParams) setParams(null);
            else
                setParams(
                    Object.entries(newParams).reduce(
                        (acc, [key, value]) => {
                            if (value === undefined) return acc;
                            if (key === "step" || key === "redirectStep") {
                                acc[key] = value;
                            } else {
                                acc[`_${key}`] = value;
                            }
                            return acc;
                        },
                        {} as Record<string, any>,
                    ),
                );
        },
        opened,
        // open()
    };
}

