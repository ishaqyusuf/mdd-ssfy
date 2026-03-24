import { Avatar } from "@/components/avatar";
import { DeleteButton } from "@/components/delete-button";
import { EditButton } from "@/components/edit-button";
import { useJobParams } from "@/hooks/use-contractor-jobs-params";
import { invalidateInfiniteQueries } from "@/hooks/use-invalidate-query";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { useJobRole } from "@/hooks/use-job-role";
import { formatDate } from "@/utils/format";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Progress } from "@gnd/ui/custom/progress";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Item } from "@gnd/ui/namespace";
import { padStart } from "@gnd/utils";
import type { ColumnDef } from "@tanstack/react-table";

export type JobItem = RouterOutputs["jobs"]["getJobs"]["data"][number];
interface ItemProps {
	item: JobItem;
}
type Column = ColumnDef<JobItem>;
const column1: Column = {
	header: "Job",
	accessorKey: "header",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<>
			<Item.Title className="whitespace-nowrap">{`#J-${padStart(item.id, 5, "0")}`}</Item.Title>
			<Item.Description>{formatDate(item.createdAt)}</Item.Description>
		</>
	),
};
const descriptionColumn: Column = {
	header: "Description",
	accessorKey: "description",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<>
			<Item.Title>
				{item.title} - {item.subtitle}{" "}
				{item.isCustom && (
					<Progress.Status badge noDot>
						Custom
					</Progress.Status>
				)}
			</Item.Title>
			<span>
				<TextWithTooltip
					text={item.description || "no report"}
					// tooltip={item.description || "no report"}
					// maxChars={50}

					className="max-w-sm line-clamp-2 xl:max-w-[250px]"
				/>
				{/* {item.description || "no report"} */}
			</span>
		</>
	),
};
const amountColumn: Column = {
	header: "Amount",
	accessorKey: "amount",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<Item.Title className="text-right">{`$${item.amount?.toFixed(2)}`}</Item.Title>
	),
};
const contractorColumn: Column = {
	header: "Contractor",
	accessorKey: "contractor",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<div className="flex items-center gap-2">
			<Avatar name={item?.user?.name} />
			<Item.Title>{item.user?.name}</Item.Title>
			{/* <Item.Description>{item.user?.email}</Item.Description> */}
		</div>
	),
};
const statusColumn: Column = {
	header: "Status",
	accessorKey: "status",
	meta: {},
	cell: ({ row: { original: item } }) => (
		<Progress.Status badge noDot>
			{item.status}
		</Progress.Status>
	),
};
const actionColumn: Column = {
	header: "",
	accessorKey: "action",
	meta: {
		actionCell: true,
		preventDefault: true,
		className: "w-[100px] dt-action-cell",
	},
	cell: ({ row: { original: item } }) => (
		<>
			<Actions item={item} />
		</>
	),
};

export const adminColumns: Column[] = [
	column1,
	descriptionColumn,
	contractorColumn,
	statusColumn,
	amountColumn,
	actionColumn,
];

export const workersColumn: Column[] = [
	column1,
	descriptionColumn,
	statusColumn,
	amountColumn,
	actionColumn,
];

function Actions({ item }: ItemProps) {
	const { setParams } = useJobFormParams();
	const isAdmin = useJobRole().isAdmin;
	return (
		<div className="relative flex items-center justify-end gap-2 z-10">
			<EditButton
				onClick={(e) => {
					setParams({
						jobId: item.id,
						step: isAdmin ? 5 : 4,
						projectId: item?.project?.id,
						unitId: item?.home?.id,
						modelId: item?.home?.communityTemplateId,
						builderTaskId: item?.builderTaskId || -1,
					});
				}}
			/>
			<DeleteButton
				// size="xs"
				size="sm"
				route="jobs.deleteJob"
				input={{ id: item.id }}
				onDelete={() => {
					invalidateInfiniteQueries("jobs.getJobs");
				}}
			/>
			{/* <Menu Trigger={<TableMenuTrigger />}>
                <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
            </Menu> */}
		</div>
	);
}
export const mobileColumn: ColumnDef<JobItem>[] = [
	{
		header: "",
		accessorKey: "row",
		meta: {
			className: "flex-1 p-0",
			// preventDefault: true,
		},
		cell: ({ row: { original: item } }) => {
			return <ItemCard item={item} />;
		},
	},
];
function ItemCard({ item }: ItemProps) {
	// design a mobile version of the columns here
	const { setParams } = useJobParams();
	return <></>;
}
