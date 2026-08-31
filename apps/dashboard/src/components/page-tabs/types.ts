export interface PageTabItem {
	id?: number;
	page?: string;
	title: string;
	count?: number;
	url?: string;
	query?: string;
	params?: Record<string, string | null>;
	clearQuery?: boolean;
	default?: boolean;
	active?: boolean;
	visibility?: "private" | "public";
	canManage?: boolean;
	index?: number;
	indexId?: string;
}
