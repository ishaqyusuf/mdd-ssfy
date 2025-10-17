export type TableApiResponse<T> = Promise<{
    data: T[];
    pageInfo: {
        pageIndex?: number | undefined;
        pageCount?: number | undefined;
        totalItems?: number | undefined;
        hasPreviousPage?: Boolean;
    };
}>;
export interface PageQuery {
    page?;
    per_page?;
    sort_order?;
    sort?;
}
export interface BaseQuery {
    id?;
    _q?;
    _projectId?;
    _builderId?;
    _userId?;
    _show?;
    _dateType?;
    status?;
    date?;
    _date?;
    from?;
    to?;
    page?;
    per_page?;
    sort_order?;
    sort?;
}
