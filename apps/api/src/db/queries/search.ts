import type {
	GlobalSearchSchema,
	GlobalSearchSource,
} from "@api/schemas/search";
import type { TRPCContext } from "@api/trpc/init";
import { getBuilders } from "@community/builder";
import { getCommunityProjects } from "./community";
import { getCommunityTemplates } from "./community-template";
import { getCustomers } from "./customer";
import { getDispatches } from "./dispatch";
import { getEmployees } from "./hrm";
import { getProjectUnits } from "./project-units";
import { getOrders, getQuotes } from "./sales";

export interface GlobalSearchResult {
	id: string;
	name: GlobalSearchSource;
	type: string;
	resultHeader: string;
	title: string;
	subtitle?: string;
	href?: string;
	meta?: Record<string, unknown>;
}

type SearchRow = Record<string, unknown>;

type SourceConfig = {
	resultHeader: string;
	fn: (ctx: TRPCContext, term: string) => Promise<unknown>;
	transform: (row: SearchRow) => GlobalSearchResult | null;
};

function asRecord(value: unknown): SearchRow | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	return value as SearchRow;
}

function asRows(value: unknown): SearchRow[] {
	if (Array.isArray(value)) {
		return value.filter((row): row is SearchRow => !!asRecord(row));
	}

	const rowContainer = asRecord(value);
	const data = rowContainer?.data;

	if (!Array.isArray(data)) {
		return [];
	}

	return data.filter((row): row is SearchRow => !!asRecord(row));
}

function pickString(...values: unknown[]): string | undefined {
	for (const value of values) {
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}

	return undefined;
}

function encodeQueryValue(value: unknown): string | undefined {
	const text = toSearchText(value);
	if (!text) return undefined;
	return encodeURIComponent(text);
}

function toSearchText(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number") {
		return String(value);
	}

	return undefined;
}

function mkResult(
	name: GlobalSearchSource,
	resultHeader: string,
	row: SearchRow,
	data: {
		title?: string;
		subtitle?: string;
		href?: string;
		meta?: Record<string, unknown>;
	},
): GlobalSearchResult | null {
	const idValue = toSearchText(row.id);
	if (!idValue) {
		return null;
	}

	return {
		id: idValue,
		name,
		type: name,
		resultHeader,
		title: data.title || `${resultHeader} #${idValue}`,
		subtitle: data.subtitle,
		href: data.href,
		meta: data.meta,
	};
}

const sourceConfigs: Record<GlobalSearchSource, SourceConfig> = {
	sales: {
		resultHeader: "Sales Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getOrders>[1] = {
				q: term,
				size: 5,
				showing: "all sales",
			};

			return getOrders(ctx, query);
		},
		transform: (row) =>
			mkResult("sales", "Sales Results", row, {
				title: pickString(
					row.orderId ? `Order ${toSearchText(row.orderId)}` : undefined,
					row.salesNo ? `Order ${toSearchText(row.salesNo)}` : undefined,
					row.displayName,
				),
				subtitle: [pickString(row.displayName), pickString(row.customerPhone)]
					.filter(Boolean)
					.join(" • "),
				href:
					row.orderId != null
						? `/sales-book/orders?orderNo=${encodeQueryValue(row.orderId)}`
						: `/sales-book/orders?q=${encodeQueryValue(row.displayName || row.id)}`,
				meta: {
					salesId: row.id,
					orderId: row.orderId,
					salesNo: row.salesNo,
				},
			}),
	},
	quotes: {
		resultHeader: "Quote Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getQuotes>[1] = {
				q: term,
				size: 5,
				showing: "all sales",
			};

			return getQuotes(ctx, query);
		},
		transform: (row) =>
			mkResult("quotes", "Quote Results", row, {
				title: pickString(
					row.orderId ? `Quote ${toSearchText(row.orderId)}` : undefined,
					row.salesNo ? `Quote ${toSearchText(row.salesNo)}` : undefined,
					row.displayName,
				),
				subtitle: [pickString(row.displayName), pickString(row.customerPhone)]
					.filter(Boolean)
					.join(" • "),
				href:
					row.orderId != null
						? `/sales-book/quotes?orderNo=${encodeQueryValue(row.orderId)}`
						: `/sales-book/quotes?q=${encodeQueryValue(row.displayName || row.id)}`,
				meta: {
					salesId: row.id,
					orderId: row.orderId,
					salesNo: row.salesNo,
				},
			}),
	},
	dispatch: {
		resultHeader: "Dispatch Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getDispatches>[1] = {
				q: term,
				size: 5,
			};

			return getDispatches(ctx, query);
		},
		transform: (row) => {
			const order = asRecord(row.order);
			const customer = asRecord(order?.customer);

			return mkResult("dispatch", "Dispatch Results", row, {
				title: pickString(
					order?.orderId
						? `Dispatch ${toSearchText(order.orderId)}`
						: undefined,
					row.id ? `Dispatch #${toSearchText(row.id)}` : undefined,
				),
				subtitle: [
					pickString(customer?.businessName),
					pickString(customer?.name),
					pickString(row.status),
				]
					.filter(Boolean)
					.join(" • "),
				href: `/sales-book/dispatch?q=${encodeQueryValue(order?.orderId || row.id)}`,
				meta: {
					dispatchId: row.id,
					salesId: order?.id,
					orderId: order?.orderId,
					status: row.status,
				},
			});
		},
	},
	employees: {
		resultHeader: "Employee Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getEmployees>[1] = {
				q: term,
				size: 5,
			};

			return getEmployees(ctx, query);
		},
		transform: (row) =>
			mkResult("employees", "Employee Results", row, {
				title: pickString(row.name, row.username),
				subtitle: [pickString(row.email), pickString(row.role)]
					.filter(Boolean)
					.join(" • "),
				href: `/hrm/employees?editEmployeeId=${encodeQueryValue(row.id)}`,
				meta: {
					employeeId: row.id,
					role: row.role,
				},
			}),
	},
	customers: {
		resultHeader: "Customer Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getCustomers>[1] = {
				q: term,
				size: 5,
			};

			return getCustomers(ctx, query);
		},
		transform: (row) =>
			mkResult("customers", "Customer Results", row, {
				title: pickString(row.businessName, row.name),
				subtitle: [pickString(row.email), pickString(row.phoneNo)]
					.filter(Boolean)
					.join(" • "),
				href: `/sales-book/customers?q=${encodeQueryValue(row.businessName || row.name || row.id)}`,
				meta: {
					customerId: row.id,
					businessName: row.businessName,
				},
			}),
	},
	projects: {
		resultHeader: "Project Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getCommunityProjects>[1] = {
				q: term,
				size: 5,
			};

			return getCommunityProjects(ctx, query);
		},
		transform: (row) => {
			const builder = asRecord(row.builder);

			return mkResult("projects", "Project Results", row, {
				title: pickString(row.title),
				subtitle: [pickString(builder?.name), pickString(row.slug)]
					.filter(Boolean)
					.join(" • "),
				href: `/community?openCommunityProjectId=${encodeQueryValue(row.id)}`,
				meta: {
					projectId: row.id,
					builderId: builder?.id,
				},
			});
		},
	},
	units: {
		resultHeader: "Unit Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getProjectUnits>[1] = {
				q: term,
				size: 5,
			};

			return getProjectUnits(ctx, query);
		},
		transform: (row) => {
			const project = asRecord(row.project);

			return mkResult("units", "Unit Results", row, {
				title: pickString(
					row.name,
					row.modelName
						? `${toSearchText(row.modelName)}${row.lot ? ` Lot ${toSearchText(row.lot)}` : ""}`
						: undefined,
					row.id ? `Unit #${toSearchText(row.id)}` : undefined,
				),
				subtitle: [pickString(project?.title), pickString(row.search)]
					.filter(Boolean)
					.join(" • "),
				href: `/community/project-units?openProjectUnitId=${encodeQueryValue(row.id)}`,
				meta: {
					unitId: row.id,
					projectId: row.projectId,
				},
			});
		},
	},
	templates: {
		resultHeader: "Template Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getCommunityTemplates>[1] = {
				q: term,
				size: 5,
			};

			return getCommunityTemplates(ctx, query);
		},
		transform: (row) => {
			const project = asRecord(row.project);
			const builder = asRecord(project?.builder);

			return mkResult("templates", "Template Results", row, {
				title: pickString(row.modelName),
				subtitle: [pickString(project?.title), pickString(builder?.name)]
					.filter(Boolean)
					.join(" • "),
				href: `/community/templates?templateId=${encodeQueryValue(row.id)}`,
				meta: {
					templateId: row.id,
					projectId: row.projectId,
				},
			});
		},
	},
	builders: {
		resultHeader: "Builder Results",
		fn: (ctx, term) => {
			const query: Parameters<typeof getBuilders>[1] = {
				q: term,
				size: 5,
			};

			return getBuilders(ctx.db, query);
		},
		transform: (row) => {
			const counts = asRecord(row._count);
			const projectsCount = toSearchText(counts?.projects) || "0";
			const homesCount = toSearchText(counts?.homes) || "0";

			return mkResult("builders", "Builder Results", row, {
				title: pickString(row.name),
				subtitle: `Projects: ${projectsCount} • Homes: ${homesCount}`,
				href: `/community/builders?openBuilderId=${encodeQueryValue(row.id)}`,
				meta: {
					builderId: row.id,
				},
			});
		},
	},
};

export async function globalSearchQuery(
	ctx: TRPCContext,
	query: GlobalSearchSchema,
) {
	const term = query?.searchTerm?.trim();
	if (!term) return [];

	const selectedSources =
		query?.sources?.length && Array.isArray(query.sources)
			? query.sources.filter(
					(name): name is GlobalSearchSource => !!sourceConfigs[name],
				)
			: (Object.keys(sourceConfigs) as GlobalSearchSource[]);

	const tasks = selectedSources.map(async (sourceName) => {
		const source = sourceConfigs[sourceName];

		try {
			const raw = await source.fn(ctx, term);
			const rows = asRows(raw);
			return rows
				.map((row) => source.transform(row))
				.filter((row): row is GlobalSearchResult => !!row);
		} catch (error) {
			console.error("[global-search] source failed", {
				source: sourceName,
				message: error instanceof Error ? error.message : String(error),
			});
			return [] as GlobalSearchResult[];
		}
	});

	const results = await Promise.all(tasks);
	const flattened = results.flat();
	const cap = query?.limit ?? 50;

	return flattened.slice(0, cap);
}

export const __globalSearchTestUtils = {
	asRows,
	pickString,
	toSearchText,
	encodeQueryValue,
	mkResult,
	sourceConfigs,
};
