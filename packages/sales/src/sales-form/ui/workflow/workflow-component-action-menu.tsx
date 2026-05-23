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
	onEdit?: () => void;
	onEditSectionOverride?: () => void;
	onSelect: () => void;
	onClearRedirect?: () => void;
	onSetRedirect?: (uid: string) => void;
	onDelete?: () => void;
};

export function WorkflowComponentActionMenu(
	props: WorkflowComponentActionMenuProps,
) {
	return (
		<Menu
			Trigger={
				<Button size="icon" variant="secondary" className="size-7">
					<Icons.MoreHorizontal className="size-4" />
				</Button>
			}
		>
			{props.onEdit ? <Menu.Item onClick={props.onEdit}>Edit</Menu.Item> : null}
			{props.onEditSectionOverride ? (
				<Menu.Item onClick={props.onEditSectionOverride}>
					Section Setting Override
				</Menu.Item>
			) : null}
			<Menu.Item onClick={props.onSelect}>Select</Menu.Item>
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
					Redirect
				</Menu.Item>
			) : null}
			{props.onDelete ? (
				<Menu.Item className="text-red-600" onClick={props.onDelete}>
					Delete
				</Menu.Item>
			) : null}
		</Menu>
	);
}
