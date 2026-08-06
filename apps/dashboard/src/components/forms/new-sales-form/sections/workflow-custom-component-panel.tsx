"use client";

import {
	CustomComponentCombobox,
	type CustomComponentOption,
} from "@/components/forms/sales-form/custom-component-combobox";
import { Alert, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";

type WorkflowCustomComponentPanelProps = {
	title: string;
	price: number | null;
	options: CustomComponentOption[];
	selectedOption: CustomComponentOption | null;
	showPrice: boolean;
	disabled: boolean;
	onTitleChange: (title: string) => void;
	onPriceChange: (price: number | null) => void;
	onSelect: (option: CustomComponentOption | null) => void;
	onDeleteOption: (option: CustomComponentOption) => void;
	onCancel: () => void;
	onProceed: () => void;
};

export function WorkflowCustomComponentPanel(
	props: WorkflowCustomComponentPanelProps,
) {
	return (
		<Alert className="rounded-md bg-background p-3 text-foreground shadow-sm">
			<AlertTitle className="mb-3">Custom Component</AlertTitle>
			<CustomComponentCombobox
				title={props.title}
				price={props.price}
				options={props.options}
				selectedOption={props.selectedOption}
				showPrice={props.showPrice}
				disabled={props.disabled}
				onTitleChange={props.onTitleChange}
				onPriceChange={props.onPriceChange}
				onSelect={props.onSelect}
				onDeleteOption={props.onDeleteOption}
			/>
			<div className="mt-3 flex flex-wrap justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={props.onCancel}
				>
					Cancel
				</Button>
				<Button
					type="button"
					size="sm"
					disabled={props.disabled || !props.title.trim()}
					onClick={props.onProceed}
				>
					Proceed
				</Button>
			</div>
		</Alert>
	);
}
