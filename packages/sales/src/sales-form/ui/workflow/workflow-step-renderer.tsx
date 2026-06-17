/** @jsxImportSource react */
"use client";

import type { ReactNode } from "react";

export type WorkflowStepRendererProps = {
	stepFamily: string;
	missingStep?: boolean;
	isHousePackageToolStep?: boolean;
	isRedirectDisabled?: boolean;
	housePackageToolPanel?: ReactNode;
	redirectDisabledPanel?: ReactNode;
	doorSupplierPanel?: ReactNode;
	mouldingLineItemPanel?: ReactNode;
	serviceLineItemPanel?: ReactNode;
	shelfPanel?: ReactNode;
	componentPickerPanel?: ReactNode;
};

export function WorkflowStepRenderer(props: WorkflowStepRendererProps) {
	if (props.isHousePackageToolStep) {
		return props.housePackageToolPanel;
	}

	if (props.isRedirectDisabled) {
		return props.redirectDisabledPanel;
	}

	if (props.stepFamily === "moulding-line-item") {
		return props.mouldingLineItemPanel ?? props.componentPickerPanel;
	}

	if (props.stepFamily === "service-line-item") {
		return props.serviceLineItemPanel ?? props.componentPickerPanel;
	}

	if (props.stepFamily === "shelf") {
		return props.shelfPanel ?? props.componentPickerPanel;
	}

	if (props.missingStep) {
		return (
			<p className="text-sm text-muted-foreground">
				Step is missing ID and cannot load components yet.
			</p>
		);
	}

	return props.doorSupplierPanel || props.componentPickerPanel;
}
