export interface PageTab {
    count?;
    params?: { [k in string]: string };
    title: string;
    url?: string;
}
