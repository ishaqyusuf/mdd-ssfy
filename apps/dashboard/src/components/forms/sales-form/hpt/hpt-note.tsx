import { doorItemControlUid } from "@/app-deps/(clean-code)/(sales)/_common/utils/item-control-utils";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import { useHpt, useHptLine } from "../context";

export function HptNote() {
	const ctx = useHptLine();
	const { hpt, itemForm, showNote } = useHpt();
	const { size, sizeForm } = ctx;
	const salesId = hpt?.zus?.metaData?.id;
	const itemId = itemForm?.id;
	const controlUid = doorItemControlUid(sizeForm?.doorId, size.size);
	const __noteTagFilter =
		salesId && itemId && sizeForm?.doorId
			? [
					noteTagFilter("itemControlUID", controlUid),
					noteTagFilter("salesItemId", itemId),
					noteTagFilter("salesId", salesId),
				]
			: null;

	if (!showNote) return null;

	return (
		<div className="rounded-lg border bg-muted/20 p-3">
			{__noteTagFilter ? (
				<Note
					admin
					subject={"Production Note"}
					headline=""
					statusFilters={["public"]}
					typeFilters={["production", "general"]}
					tagFilters={__noteTagFilter}
				/>
			) : (
				<div className="flex items-center text-center font-mono$ text-red-600">
					<span>To access item note, you need to first save your invoice</span>
				</div>
			)}
		</div>
	);
}
