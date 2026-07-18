import { useJobFormContext } from "@/contexts/job-form-context";
import { useJobRole } from "@/hooks/use-job-role";
import { useMemo } from "react";
import { DataTable as NewJobInstallTasksTable } from "../../tables-2/new-job-install-tasks/data-table";
import { MissingTasksConfig } from "./missing-tasks-config";

export function InstallTasksList({ form }) {
	const { defaultValues, state } = useJobFormContext();
	const jobRole = useJobRole();
	if (!defaultValues?.builderTaskId) return null;
	const tasks = defaultValues?.job?.tasks;
	if (!tasks?.length) return <MissingTasksConfig form={form} />;

	const showTaskQty = state.showTaskQty || jobRole.isAdmin;
	const taskRows = useMemo(
		() =>
			tasks.map((cost, index) => ({
				id: `${cost.installCostModel?.title ?? "install-task"}-${index}`,
				index,
				title: cost.installCostModel?.title ?? "Untitled task",
				rate: Number(cost.rate ?? 0),
				maxQty: Number(cost.maxQty ?? 0),
			})),
		[tasks],
	);

	return (
		<div className="space-y-3">
			<h3 className="text-sm font-bold text-foreground">Install Costs</h3>
			<NewJobInstallTasksTable
				control={form.control}
				data={taskRows}
				isAdmin={jobRole.isAdmin}
				showTaskQty={showTaskQty}
			/>
		</div>
	);
}
