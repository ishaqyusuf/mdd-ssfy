const NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD = 48;
const IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD = 64;

export function getSectionLeadInPresenceAhead(hasImageColumn = false) {
	return hasImageColumn
		? IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD
		: NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD;
}
