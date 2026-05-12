const NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD = 48;
const IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD = 64;

type SectionLeadInOptions = {
	detailRowCount?: number;
	hasTableHeader?: boolean;
	hasFirstRow?: boolean;
};

export function getSectionLeadInPresenceAhead(
	hasImageColumn = false,
	options: SectionLeadInOptions = {},
) {
	const minimum = hasImageColumn
		? IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD
		: NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD;
	const estimated =
		24 +
		(options.detailRowCount ?? 0) * 20 +
		(options.hasTableHeader ? 28 : 0) +
		(options.hasFirstRow ? (hasImageColumn ? 64 : 36) : 0) +
		16;

	return Math.max(minimum, estimated);
}
