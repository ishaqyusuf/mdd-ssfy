/** Exercise the new catalog in development; production requires an explicit rollout. */
export function isSalesCatalogCacheEnabled() {
	return (
		process.env.NEXT_PUBLIC_SALES_CATALOG_CACHE === "1" ||
		(process.env.NODE_ENV !== "production" &&
			process.env.NEXT_PUBLIC_SALES_CATALOG_CACHE !== "0")
	);
}
