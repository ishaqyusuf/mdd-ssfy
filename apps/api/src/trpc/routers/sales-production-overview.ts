/**
 * Core Production-tab data must remain independent from readiness so inventory
 * projection latency or failure can never suppress production items.
 */
export function loadCoreProductionOverview<TOverview>(
	loadOverview: () => Promise<TOverview>,
) {
	return loadOverview();
}
