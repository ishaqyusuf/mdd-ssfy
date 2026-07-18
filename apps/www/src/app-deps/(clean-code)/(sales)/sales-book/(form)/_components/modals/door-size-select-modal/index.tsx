import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { DoorSupplierBadge } from "@/components/forms/sales-form/door-supplier-badge";
import {
	DataTable as CleanCodeDoorSizeSelectLinesTable,
	buildCleanCodeDoorSizeSelectRows,
} from "@/components/tables-2/clean-code-door-size-select-lines/data-table";
import { useMemo } from "react";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";

import type { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";

import type { Door } from "../door-swap-modal";

import { DoorSizeSelectProvider, useCtx } from "./use-door-size-select";

interface Props {
	cls: ComponentHelperClass;
	door?: Door;
}

export default function DoorSizeSelectModal({ cls, door }: Props) {
	return (
		<DoorSizeSelectProvider
			args={[
				{
					cls,
					door,
				},
			]}
		>
			<Content />
		</DoorSizeSelectProvider>
	);
}

function Content() {
	const ctx = useCtx();
	const config = ctx.routeConfig;
	const { door } = ctx;
	const rows = useMemo(
		() => buildCleanCodeDoorSizeSelectRows(ctx.sizePriceList),
		[ctx.sizePriceList],
	);

	return (
		<Modal.Content size={config.hasSwing || !config.noHandle ? "lg" : "md"}>
			<Modal.Header
				title={ctx.cls?.getComponent?.title || "Component Price"}
				subtitle="Select door!!"
			/>
			<div className="flex gap-4">
				<div className="flex-1" />
				<div>
					<DoorSupplierBadge itemStepUid={ctx.cls.itemStepUid} />
				</div>
			</div>
			<Form {...ctx.form}>
				<CleanCodeDoorSizeSelectLinesTable
					data={rows}
					showSwing={Boolean(config.hasSwing)}
					noHandle={Boolean(config.noHandle)}
				/>
			</Form>
			{door ? (
				<Modal.Footer
					className=""
					submitText="Swap Door"
					size="sm"
					onSubmit={ctx.swapDoor}
				>
					<Button
						onClick={() => {
							_modal.close();
						}}
						variant="destructive"
						size="sm"
					>
						Cancel Swap
					</Button>
				</Modal.Footer>
			) : (
				<Modal.Footer
					className=""
					submitText="Pick More"
					size="sm"
					onSubmit={ctx.pickMore}
				>
					<Button onClick={ctx.removeSelection} variant="destructive" size="sm">
						Remove Selection
					</Button>
					<div className="flex-1" />
					<Button onClick={ctx.nextStep} variant="secondary" size="sm">
						Next Step
					</Button>
				</Modal.Footer>
			)}
		</Modal.Content>
	);
}
