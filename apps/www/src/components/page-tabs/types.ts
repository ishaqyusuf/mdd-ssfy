export interface PageTabItem {
	id?: number;
	page?: string;
	title: string;
	count?: number;
	url?: string;
	query?: string;
	params?: Record<string, string>;
	default?: boolean;
	index?: number;
	indexId?: string;
}
