/** @jsxImportSource react */
"use client";

import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";

export type WorkflowComponentRedirectOption = {
	uid: string;
	title: string;
};

export type WorkflowComponentActionMenuProps = {
	redirectOptions: WorkflowComponentRedirectOption[];
	onEditDetails?: () => void;
	onEditVisibility?: () => void;
	onEditPricing?: () => void;
	showPricing?: boolean;
	pricingDisabled?: boolean;
	onEditSectionOverride?: () => void;
	onSelect?: () => void;
	onClearRedirect?: () => void;
	onSetRedirect?: (uid: string) => void;
	onArchive?: () => void;
};

export function WorkflowComponentActionMenu(
	props: WorkflowComponentActionMenuProps,
) {
	return (
		<Menu
			Trigger={
				<Button
					type="button"
					size="icon"
					variant="secondary"
					className="size-7"
					aria-label="Component actions"
				>
					<Icons.MoreHorizontal className="size-4" />
				</Button>
			}
		>
			{props.onEditDetails ||
			props.onEditVisibility ||
			props.showPricing ||
			props.onEditSectionOverride ? (
				<Menu.Item
					Icon={Icons.edit}
					SubMenu={
						<>
							{props.onEditDetails ? (
								<Menu.Item Icon={Icons.Info} onClick={props.onEditDetails}>
									Details
								</Menu.Item>
							) : null}
							{props.onEditVisibility ? (
								<Menu.Item
									Icon={Icons.Variable}
									onClick={props.onEditVisibility}
								>
									Visibility
								</Menu.Item>
							) : null}
							{props.showPricing ? (
								<Menu.Item
									Icon={Icons.dollar}
									disabled={props.pricingDisabled || !props.onEditPricing}
									onClick={props.onEditPricing}
								>
									Price
								</Menu.Item>
							) : null}
							{props.onEditSectionOverride ? (
								<Menu.Item
									Icon={Icons.VariableIcon}
									onClick={props.onEditSectionOverride}
								>
									Section Setting Override
								</Menu.Item>
							) : null}
						</>
					}
				>
					Edit
				</Menu.Item>
			) : null}
			{props.onSelect ? (
				<Menu.Item Icon={Icons.CheckCircle} onClick={props.onSelect}>
					Select
				</Menu.Item>
			) : null}
			{props.onSetRedirect || props.onClearRedirect ? (
				<Menu.Item
					disabled={!props.redirectOptions.length && !props.onClearRedirect}
					SubMenu={[
						props.onClearRedirect ? (
							<Menu.Item key="redirect-none" onClick={props.onClearRedirect}>
								Cancel Redirect
							</Menu.Item>
						) : null,
						...(props.onSetRedirect
							? props.redirectOptions.map((step) => (
									<Menu.Item
										key={`redirect-${step.uid}`}
										onClick={() => props.onSetRedirect?.(step.uid)}
									>
										{step.title}
									</Menu.Item>
								))
							: []),
					].filter(Boolean)}
				>
					<Icons.ExternalLink className="size-3.5" /> Redirect
				</Menu.Item>
			) : null}
			{props.onArchive ? (
				<Menu.Item
					Icon={Icons.Trash}
					className="text-red-600"
					onClick={props.onArchive}
				>
					Delete
				</Menu.Item>
			) : null}
		</Menu>
	);
}
