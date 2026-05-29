export type SalesFormDealerProfileCardProfile = {
	id?: number | null;
	title?: string | null;
	salesPercentage?: number | null;
	coefficient?: number | null;
};

export type SalesFormDealerProfileCardProps = {
	dealerName?: string | null;
	dealerEmail?: string | null;
	profile?: SalesFormDealerProfileCardProfile | null;
	internalProfile?: SalesFormDealerProfileCardProfile | null;
	showInternalProfile?: boolean;
};

function displayText(value?: string | number | null, fallback = "Not set") {
	const text = String(value ?? "").trim();
	return text || fallback;
}

function formatPercent(value?: number | null) {
	if (value == null) return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return `${new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 2,
	}).format(number)}%`;
}

function formatCoefficient(value?: number | null) {
	if (value == null) return null;
	const number = Number(value);
	if (!Number.isFinite(number)) return null;
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 4,
	}).format(number);
}

function initials(value?: string | null) {
	return (
		String(value || "")
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join("") || "DL"
	);
}

export function SalesFormDealerProfileCard({
	dealerEmail,
	dealerName,
	internalProfile,
	profile,
	showInternalProfile = false,
}: SalesFormDealerProfileCardProps) {
	const title = displayText(dealerName || dealerEmail, "Dealer");
	const profilePercent = formatPercent(profile?.salesPercentage);
	const internalCoefficient = formatCoefficient(internalProfile?.coefficient);

	return (
		<div className="overflow-hidden rounded-lg border bg-card shadow-sm">
			<div className="flex items-start gap-3 p-4">
				<div className="flex size-11 shrink-0 items-center justify-center rounded-md border bg-muted text-sm font-bold">
					{initials(title)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
						<span>Dealer</span>
					</div>
					<p className="mt-1 truncate text-base font-semibold leading-tight">
						{title}
					</p>
					{dealerEmail ? (
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{dealerEmail}
						</p>
					) : null}
				</div>
			</div>

			<div className="grid gap-2 border-t bg-muted/20 p-4 text-sm">
				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2 text-muted-foreground">
						<span className="truncate">Dealer customer profile</span>
					</div>
					<div className="min-w-0 text-right">
						<p className="truncate font-semibold">
							{displayText(profile?.title)}
						</p>
						{profilePercent ? (
							<p className="text-xs text-muted-foreground">
								Markup {profilePercent}
							</p>
						) : null}
					</div>
				</div>

				{showInternalProfile ? (
					<div className="flex items-center justify-between gap-3 border-t pt-2">
						<div className="flex min-w-0 items-center gap-2 text-muted-foreground">
							<span className="truncate">Internal profile</span>
						</div>
						<div className="min-w-0 text-right">
							<p className="truncate font-semibold">
								{displayText(internalProfile?.title)}
							</p>
							{internalCoefficient ? (
								<p className="text-xs text-muted-foreground">
									Coefficient {internalCoefficient}
								</p>
							) : null}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
