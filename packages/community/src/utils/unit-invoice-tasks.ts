export type UnitInvoiceDedupTask = {
  id: number;
  taskUid?: string | null;
  taskName?: string | null;
  builderTaskId?: number | null;
};

function normalizeTaskName(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

export function getUnitInvoiceTaskDedupKey(task: {
  id: number;
  taskUid?: string | null;
  taskName?: string | null;
}) {
  return task.taskUid || normalizeTaskName(task.taskName) || `task-${task.id}`;
}

export function groupDuplicateUnitInvoiceTasks<T extends UnitInvoiceDedupTask>(
  tasks: T[],
) {
  const taskMap = new Map<
    string,
    {
      key: string;
      kept: T;
      duplicates: T[];
    }
  >();

  for (const task of tasks) {
    const key = getUnitInvoiceTaskDedupKey(task);
    const existing = taskMap.get(key);

    if (existing) {
      existing.duplicates.push(task);
      continue;
    }

    taskMap.set(key, {
      key,
      kept: task,
      duplicates: [],
    });
  }

  return Array.from(taskMap.values());
}

export function dedupeUnitInvoiceTasks<T extends UnitInvoiceDedupTask>(
  tasks: T[],
) {
  const groups = groupDuplicateUnitInvoiceTasks(tasks);

  return {
    tasks: groups.map((group) => group.kept),
    duplicateTaskIds: groups.flatMap((group) =>
      group.duplicates.map((task) => task.id),
    ),
    groups,
  };
}
