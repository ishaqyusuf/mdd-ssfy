export function getPageTabButtonVariant(active: boolean) {
	return active ? ("default" as const) : ("ghost" as const);
}
