"use client";

import { sizeClass, sizes } from "@/components/tables-2/core/table-sizes";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";

export type DealerRow = RouterOutputs["dealer"]["list"][number];
type SalesProfile = RouterOutputs["dealer"]["salesProfiles"][number];

export type SalesProfileOption = {
	id: string;
	label: string;
	coefficient?: number | null;
};

export type DealerColumnOptions = {
	profiles: SalesProfileOption[];
	isProfilesLoading?: boolean;
	updatingProfileDealerId?: number | null;
	resendingDealerId?: number | null;
	isResending?: boolean;
	onUpdateSalesProfile: (dealerId: number, profileId: number) => void;
	onResendOnboarding: (dealerId: number) => void;
};

type Column = ColumnDef<DealerRow>;

export function getDealerRowId(dealer: DealerRow) {
	return String(dealer.id);
}

function getDealerName(dealer: DealerRow) {
	return (
		dealer.companyName ||
		dealer.name ||
		dealer.dealer?.businessName ||
		dealer.dealer?.name ||
		"Unnamed dealer"
	);
}

function getInitials(value?: string | null) {
	if (!value) return "DE";

	return value
		.split(" ")
		.slice(0, 2)
		.map((segment) => segment[0]?.toUpperCase() || "")
		.join("");
}

function formatDate(value?: Date | string | null) {
	if (!value) return "Not set";

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

function statusTone(status?: string | null) {
	switch (status) {
		case "active":
		case "approved":
			return "border-emerald-200 bg-emerald-50 text-emerald-700";
		case "restricted":
		case "suspended":
			return "border-red-200 bg-red-50 text-red-700";
		default:
			return "border-amber-200 bg-amber-50 text-amber-800";
	}
}

export function createDealerColumns(options: DealerColumnOptions): Column[] {
	const dealerColumn: Column = {
		id: "dealer",
		header: "Dealer",
		accessorFn: getDealerName,
		...sizes.custom(180, 320, 220),
		enableResizing: true,
		meta: {
			sticky: true,
			skeleton: { type: "avatar-text", width: "w-32" },
			headerLabel: "Dealer",
			sortField: "name",
			className: sizeClass(
				sizes.custom(180, 320, 220),
				"md:sticky md:left-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => {
			const dealer = row.original;
			const dealerName = getDealerName(dealer);

			return (
				<div className="flex min-w-0 items-center gap-2 overflow-hidden">
					<div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
						{getInitials(dealerName)}
					</div>
					<div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
						<TextWithTooltip
							className="max-w-full truncate text-sm font-medium uppercase"
							text={dealerName}
						/>
						<span className="shrink-0 truncate font-mono text-[11px] text-muted-foreground">
							Dealer #{dealer.id}
						</span>
					</div>
				</div>
			);
		},
	};

	const emailColumn: Column = {
		id: "email",
		header: "Email",
		accessorKey: "email",
		...sizes.custom(150, 280, 200),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-36" },
			headerLabel: "Email",
			sortField: "email",
			className: sizeClass(sizes.custom(150, 280, 200)),
		},
		cell: ({ row }) => (
			<TextWithTooltip
				className="max-w-full truncate text-muted-foreground"
				text={row.original.email || "No email"}
			/>
		),
	};

	const statusColumn: Column = {
		id: "status",
		header: "Status",
		accessorKey: "status",
		...sizes.custom(104, 150, 116),
		enableResizing: true,
		meta: {
			skeleton: { type: "badge", width: "w-20" },
			headerLabel: "Status",
			sortField: "status",
			className: sizeClass(sizes.custom(104, 150, 116)),
		},
		cell: ({ row }) => (
			<Badge
				variant="outline"
				className={`rounded-full capitalize ${statusTone(row.original.status)}`}
			>
				{row.original.status || "pending"}
			</Badge>
		),
	};

	const profileColumn: Column = {
		id: "profile",
		header: "Sales profile",
		accessorFn: (row) => row.dealer?.profile?.title,
		...sizes.custom(180, 280, 210),
		enableResizing: true,
		meta: {
			skeleton: { type: "button", width: "w-36" },
			headerLabel: "Sales profile",
			className: sizeClass(sizes.custom(180, 280, 210)),
		},
		cell: ({ row }) => {
			const dealer = row.original;
			const isUpdating = options.updatingProfileDealerId === dealer.id;

			return (
				<DealerSalesProfileSelect
					disabled={isUpdating}
					isLoading={options.isProfilesLoading}
					onChange={(profileId) =>
						options.onUpdateSalesProfile(dealer.id, profileId)
					}
					options={options.profiles}
					profile={dealer.dealer?.profile ?? null}
				/>
			);
		},
	};

	const customerColumn: Column = {
		id: "customer",
		header: "Customer link",
		accessorFn: (row) =>
			row.dealer?.businessName || row.dealer?.name || row.dealer?.id,
		...sizes.custom(150, 280, 200),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-36" },
			headerLabel: "Customer link",
			className: sizeClass(sizes.custom(150, 280, 200)),
		},
		cell: ({ row }) => {
			const customer = row.original.dealer;

			return customer ? (
				<TextWithTooltip
					className="max-w-full truncate text-sm"
					text={
						customer.businessName || customer.name || `Customer #${customer.id}`
					}
				/>
			) : (
				<span className="text-sm text-muted-foreground">
					Dealer-only profile
				</span>
			);
		},
	};

	const createdAtColumn: Column = {
		id: "createdAt",
		header: "Created",
		accessorKey: "createdAt",
		...sizes.custom(112, 170, 128),
		enableResizing: true,
		meta: {
			skeleton: { type: "text", width: "w-24" },
			headerLabel: "Created",
			sortField: "createdAt",
			className: sizeClass(sizes.custom(112, 170, 128)),
		},
		cell: ({ row }) => (
			<span className="truncate text-sm text-muted-foreground">
				{formatDate(row.original.createdAt)}
			</span>
		),
	};

	const actionsColumn: Column = {
		id: "actions",
		header: "Actions",
		...sizes.custom(82, 104, 92),
		enableResizing: false,
		enableHiding: false,
		enableSorting: false,
		meta: {
			actionCell: true,
			preventDefault: true,
			headerLabel: "Actions",
			skeleton: { type: "button", width: "w-20" },
			className: sizeClass(
				sizes.custom(82, 104, 92),
				"md:sticky md:right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-20",
			),
		},
		cell: ({ row }) => {
			const dealer = row.original;
			const isResending =
				Boolean(options.isResending) && options.resendingDealerId === dealer.id;
			const canResendOnboarding = !dealer.authUserId;

			return (
				<div className="flex justify-end">
					<Button
						className="h-8 gap-2"
						disabled={!canResendOnboarding || options.isResending}
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							options.onResendOnboarding(dealer.id);
						}}
						size="sm"
						type="button"
						variant="outline"
					>
						{isResending ? (
							<Icons.Loader2 className="size-3.5 animate-spin" />
						) : (
							<Icons.Mail className="size-3.5" />
						)}
						Resend
					</Button>
				</div>
			);
		},
	};

	return [
		dealerColumn,
		emailColumn,
		statusColumn,
		profileColumn,
		customerColumn,
		createdAtColumn,
		actionsColumn,
	];
}

function DealerSalesProfileSelect({
	disabled,
	isLoading,
	onChange,
	options,
	profile,
}: {
	disabled?: boolean;
	isLoading?: boolean;
	onChange: (profileId: number) => void;
	options: SalesProfileOption[];
	profile?: Pick<SalesProfile, "id" | "title" | "coefficient"> | null;
}) {
	const selectedItem =
		options.find((option) => option.id === String(profile?.id || "")) ??
		(profile
			? {
					id: String(profile.id),
					label: profile.title,
					coefficient: profile.coefficient,
				}
			: undefined);

	return (
		<div className="flex min-w-0 items-center gap-2">
			<ComboboxDropdown
				disabled={disabled || isLoading}
				emptyResults="No sales profiles found"
				isLoading={isLoading}
				items={options}
				onSelect={(option) => {
					const nextProfileId = Number(option.id);
					if (!Number.isFinite(nextProfileId)) return;
					if (nextProfileId === profile?.id) return;
					onChange(nextProfileId);
				}}
				placeholder={isLoading ? "Loading profiles" : "Set profile"}
				popoverProps={{ align: "start", className: "p-0" }}
				Trigger={
					<Button
						type="button"
						variant="outline"
						className="h-8 min-w-0 flex-1 justify-between gap-2 px-2 text-xs"
					>
						<span className="truncate">
							{selectedItem?.label ||
								(isLoading ? "Loading profiles" : "Set profile")}
						</span>
						<Icons.ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
					</Button>
				}
				searchPlaceholder="Search profiles"
				selectedItem={selectedItem}
			/>
			<span className="shrink-0 text-[11px] text-muted-foreground">
				{selectedItem?.coefficient ?? "-"}
			</span>
		</div>
	);
}
