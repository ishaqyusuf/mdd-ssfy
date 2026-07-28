export function getPageTabButtonVariant(active: boolean) {
	return active ? ("default" as const) : ("ghost" as const);
}

export function getPageTabButtonClassName(active: boolean) {
	return active
		? "bg-orange-700 text-white shadow-sm shadow-orange-700/20 hover:bg-orange-700 focus-visible:border-orange-500 focus-visible:ring-orange-500/40 dark:bg-orange-500 dark:text-orange-950 dark:shadow-orange-950/30 dark:hover:bg-orange-500"
		: "text-muted-foreground";
}
