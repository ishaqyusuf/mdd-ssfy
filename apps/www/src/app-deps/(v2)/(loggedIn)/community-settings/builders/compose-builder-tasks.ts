import { transformData } from "@/lib/utils";
import { IBuilderTasks, IHomeTask } from "@/types/community";

export function composeBuilderTasks(
    builderTasks: IBuilderTasks[],
    taskData: {
        projectId;
        homeId;
        search;
    }[],
    homeCost?
) {
    const tasks: any[] = [];
    taskData.map((td) => {
        builderTasks.map((builderTask) => {
            const _task: IHomeTask = {
                meta: {},
                ...td,
            } as any;
            _task.billable = builderTask.billable as boolean;
            _task.installable = builderTask.installable as boolean;
            const uid = (_task.taskUid = builderTask.uid);
            _task.taskName = builderTask.name;
            _task.amountDue = _task.meta.system_task_cost =
                Number(homeCost?.meta?.costs[uid]) || (null as any);
            _task.status = "";
            tasks.push(transformData(_task));
        });
    });
    return tasks;
}
