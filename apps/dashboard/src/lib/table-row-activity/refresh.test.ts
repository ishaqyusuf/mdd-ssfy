import { expect, it } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import { observeTableRefresh } from "./refresh";

type Data = { pages: { id: number }[][] };
it("accepts a network refetch but never a cache write or a smaller page window", async () => {
	const client = new QueryClient();
	const queryKey = ["orders"];
	client.setQueryData<Data>(queryKey, { pages: [[{ id: 1 }], [{ id: 2 }]] });
	const observer = observeTableRefresh<Data>(client, queryKey, (data) => ({
		pageCount: data.pages.length,
		entityIds: data.pages.flatMap((page) => page.map((row) => row.id)),
	}));
	const stop = observer.subscribe(() => {});
	client.setQueryData(queryKey, { pages: [[], []] });
	expect(observer.getSnapshot()).toBe(undefined);
	await client.fetchQuery({
		queryKey,
		queryFn: async () => ({ pages: [[], [{ id: 2 }]] }),
	});
	const receipt = observer.getSnapshot();
	expect([...receipt!.entityIds]).toEqual([2]);
	await client.fetchQuery({ queryKey, queryFn: async () => ({ pages: [[]] }) });
	expect(observer.getSnapshot()).toBe(receipt);
	expect(observer.getSnapshot()?.data === client.getQueryData(queryKey)).toBe(
		false,
	);
	stop();
	client.clear();
});

it("accepts a complete infinite refetch when the server exhausts fewer pages", async () => {
	const client = new QueryClient();
	const queryKey = ["shrinking-orders"];
	type Page = { ids: number[]; cursor: number | null };
	type Infinite = { pages: Page[]; pageParams: number[] };
	client.setQueryData<Infinite>(queryKey, {
		pages: [
			{ ids: [1], cursor: 1 },
			{ ids: [2], cursor: null },
		],
		pageParams: [0, 1],
	});
	const observer = observeTableRefresh<Infinite>(client, queryKey, (data) => ({
		pageCount: data.pages.length,
		entityIds: data.pages.flatMap((page) => page.ids),
		exhausted: data.pages.at(-1)?.cursor === null,
	}));
	const stop = observer.subscribe(() => {});
	let requests = 0;
	await client.fetchInfiniteQuery({
		queryKey,
		initialPageParam: 0,
		getNextPageParam: (page: Page) => page.cursor,
		queryFn: async (): Promise<Page> => {
			requests++;
			return { ids: [], cursor: null };
		},
	});
	expect(requests).toBe(1);
	expect(observer.getSnapshot()?.data.pages.length).toBe(1);
	expect([...observer.getSnapshot()!.entityIds]).toEqual([]);
	stop();
	client.clear();
});
