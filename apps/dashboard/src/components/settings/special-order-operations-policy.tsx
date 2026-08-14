import type { SpecialOrderSettings } from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";

const ENFORCEMENT_OPTIONS = [
	{
		value: "WARNING_ONLY",
		label: "Warning Only",
		description: "Show approval warnings without stopping operations.",
	},
	{
		value: "BLOCK_PURCHASING_AND_PRODUCTION",
		label: "Block Purchasing & Production",
		description:
			"Require Current Approval before new purchasing or production.",
	},
	{
		value: "BLOCK_ALL_OPERATIONS",
		label: "Block All Operations",
		description: "Also require Current Approval before packing and dispatch.",
	},
] as const;

const RELEASE_AUDIENCE_OPTIONS = [
	{
		value: "SUPER_ADMIN_ONLY",
		label: "Super Admin only",
		description:
			"Only Super Admin sees the Sales Form prompt and can mark orders as Special Order.",
	},
	{
		value: "ALL_STAFF",
		label: "All eligible Sales staff",
		description:
			"Show the required declaration to every employee who can create or edit orders.",
	},
] as const;

export function SpecialOrderOperationsPolicy({
	settings,
	isSaving,
	onChange,
	onSave,
}: {
	settings: SpecialOrderSettings;
	isSaving: boolean;
	onChange: (settings: SpecialOrderSettings) => void;
	onSave: () => void;
}) {
	const selected = ENFORCEMENT_OPTIONS.find(
		(option) => option.value === settings.enforcementMode,
	);
	const selectedAudience = RELEASE_AUDIENCE_OPTIONS.find(
		(option) => option.value === settings.releaseAudience,
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Operations policy</CardTitle>
			</CardHeader>
			<CardContent>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="special-order-release-audience">
							Who can mark Special Orders
						</FieldLabel>
						<Select
							value={settings.releaseAudience}
							onValueChange={(releaseAudience) =>
								onChange({
									...settings,
									releaseAudience:
										releaseAudience as SpecialOrderSettings["releaseAudience"],
								})
							}
						>
							<SelectTrigger id="special-order-release-audience">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{RELEASE_AUDIENCE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>
							{selectedAudience?.description} Existing marked orders continue to
							follow the full approval and operations workflow.
						</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="special-order-enforcement">
							Enforcement mode
						</FieldLabel>
						<Select
							value={settings.enforcementMode}
							onValueChange={(enforcementMode) =>
								onChange({
									...settings,
									enforcementMode:
										enforcementMode as SpecialOrderSettings["enforcementMode"],
								})
							}
						>
							<SelectTrigger id="special-order-enforcement">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ENFORCEMENT_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<FieldDescription>{selected?.description}</FieldDescription>
					</Field>
					<Field>
						<FieldLabel htmlFor="special-order-link-days">
							Approval-link lifetime
						</FieldLabel>
						<Input
							id="special-order-link-days"
							type="number"
							min={1}
							max={30}
							value={settings.approvalLinkLifetimeDays}
							onChange={(event) =>
								onChange({
									...settings,
									approvalLinkLifetimeDays: Number(event.target.value),
								})
							}
						/>
						<FieldDescription>
							Links may remain active for 1–30 days. The default is 7 days.
						</FieldDescription>
					</Field>
				</FieldGroup>
				<div className="mt-6 flex justify-end">
					<Button
						disabled={
							isSaving ||
							settings.approvalLinkLifetimeDays < 1 ||
							settings.approvalLinkLifetimeDays > 30
						}
						onClick={onSave}
					>
						Save operations policy
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
