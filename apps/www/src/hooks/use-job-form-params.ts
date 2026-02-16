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
        setParams: (newParams) => {
            if (!newParams) setParams(null);
            else
                setParams(
                    Object.entries(newParams).reduce(
                        (acc, [key, value]) => {
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
    };
}

