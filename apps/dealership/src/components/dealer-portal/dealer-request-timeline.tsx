function formatTimelineDate(value?: Date | string | null) {
	if (!value) return null;
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(value));
}

export function DealerRequestTimeline({
	status,
	requestedAt,
	decisionAt,
	decisionNote,
}: {
	status?: string | null;
	requestedAt?: Date | string | null;
	decisionAt?: Date | string | null;
	decisionNote?: string | null;
}) {
	if (!status) return null;
	const requestDate = formatTimelineDate(requestedAt);
	const resolvedDate = formatTimelineDate(decisionAt);

	return (
		<div className="mt-1 max-w-[280px] space-y-0.5 text-xs text-muted-foreground">
			<p>{requestDate ? `Requested ${requestDate}` : "Order requested"}</p>
			{status === "pending" ? (
				<p>Office reviewing delivery and pricing</p>
			) : null}
			{status === "approved" ? (
				<p>
					{resolvedDate ? `Approved ${resolvedDate}` : "Approved by GND"} ·
					Ready to pay GND
				</p>
			) : null}
			{status === "rejected" ? (
				<p className="text-destructive">
					{resolvedDate
						? `Changes requested ${resolvedDate}`
						: "Changes requested"}
					{decisionNote ? ` · ${decisionNote}` : ""}
				</p>
			) : null}
		</div>
	);
}
