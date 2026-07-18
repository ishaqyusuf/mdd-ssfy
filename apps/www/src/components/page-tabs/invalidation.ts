import { normalizePagePath } from "./query-utils";

export const PAGE_TAB_PATHS = {
	orders: "/sales-book/orders",
	quotes: "/sales-book/quotes",
	customers: "/sales-book/customers",
	dealers: "/sales-book/dealers",
	employees: "/hrm/employees",
	jobs: "/hrm/contractors/jobs",
	projects: "/community/projects",
	units: "/community/project-units",
	unitInvoices: "/community/unit-invoices",
	templates: "/community/templates",
	customerServices: "/community/customer-services",
	communityProductions: "/community/unit-productions",
} as const;

export type PageTabPathKey = keyof typeof PAGE_TAB_PATHS;

type QueryClientLike = {
	invalidateQueries: (input: {
		queryKey: readonly unknown[];
	}) => Promise<unknown>;
};

type PageTabsTRPCLike = {
	pageTabs: {
		list: {
			queryKey: (input: {
				page: string;
				includeInactive?: boolean;
			}) => readonly unknown[];
		};
		defaults: {
			queryKey: () => readonly unknown[];
		};
	};
};

type PageTabsInvalidationContext = {
	queryClient: QueryClientLike;
	trpc: PageTabsTRPCLike;
	currentPath: string;
};

export function resolvePageTabPath(key: PageTabPathKey) {
	return PAGE_TAB_PATHS[key];
}

export function normalizePageTabPaths(paths: string[]) {
	return Array.from(
		new Set(
			paths
				.map((path) => path.trim())
				.filter(Boolean)
				.map(normalizePagePath),
		),
	);
}

export async function invalidatePageTabs(
	queryClient: QueryClientLike,
	trpc: PageTabsTRPCLike,
	...paths: string[]
) {
	return invalidatePageTabsForPaths(queryClient, trpc, ...paths);
}

export async function invalidatePageTabsForPathKeys(
	queryClient: QueryClientLike,
	trpc: PageTabsTRPCLike,
	...keys: PageTabPathKey[]
) {
	return invalidatePageTabsForPaths(
		queryClient,
		trpc,
		...keys.map(resolvePageTabPath),
	);
}

export async function invalidatePageTabsForPaths(
	queryClient: QueryClientLike,
	trpc: PageTabsTRPCLike,
	...paths: string[]
) {
	const pages = normalizePageTabPaths(paths);
	if (!pages.length) return [];

	return Promise.all([
		...pages.flatMap((page) => [
			queryClient.invalidateQueries({
				queryKey: trpc.pageTabs.list.queryKey({ page }),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.pageTabs.list.queryKey({
					page,
					includeInactive: true,
				}),
			}),
		]),
		queryClient.invalidateQueries({
			queryKey: trpc.pageTabs.defaults.queryKey(),
		}),
	]);
}

export function createPageTabsInvalidation({
	queryClient,
	trpc,
	currentPath,
}: PageTabsInvalidationContext) {
	return {
		invalidate: (...keys: PageTabPathKey[]) => {
			if (!keys.length) {
				return invalidatePageTabsForPaths(queryClient, trpc, currentPath);
			}

			return invalidatePageTabsForPathKeys(queryClient, trpc, ...keys);
		},
		invalidatePath: (...paths: string[]) =>
			invalidatePageTabsForPaths(
				queryClient,
				trpc,
				...(paths.length ? paths : [currentPath]),
			),
		paths: PAGE_TAB_PATHS,
	};
}
