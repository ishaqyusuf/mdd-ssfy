import type { useTRPC } from "@/trpc/context";

type TRPCProxy = ReturnType<typeof useTRPC>;

type ProcedurePaths<T, Marker extends PropertyKey> = {
	[K in keyof T & string]: T[K] extends Record<Marker, unknown>
		? K
		: T[K] extends object
			? `${K}.${ProcedurePaths<T[K], Marker>}`
			: never;
}[keyof T & string];

type ProcedureAtPath<
	T,
	Path extends string,
> = Path extends `${infer Head}.${infer Tail}`
	? Head extends keyof T
		? ProcedureAtPath<T[Head], Tail>
		: never
	: Path extends keyof T
		? T[Path]
		: never;

type ProcedureInput<Path extends string> = ProcedureAtPath<
	TRPCProxy,
	Path
> extends {
	"~types": {
		input: infer Input;
	};
}
	? Input
	: never;

type InputArgs<Input> = undefined extends Input
	? [input?: Input]
	: [input: Input];

export type QueryRoute = ProcedurePaths<TRPCProxy, "queryKey">;
export type InfiniteQueryRoute = ProcedurePaths<TRPCProxy, "infiniteQueryKey">;
export type MutationRoute = ProcedurePaths<TRPCProxy, "mutationKey">;

export type QueryRouteInput<Route extends QueryRoute> = ProcedureInput<Route>;
export type InfiniteQueryRouteInput<Route extends InfiniteQueryRoute> =
	ProcedureInput<Route>;

export type PathQueryTarget<Route extends QueryRoute = QueryRoute> = {
	mode: "path";
	route: Route;
};

export type ExactQueryTarget<Route extends QueryRoute = QueryRoute> = {
	mode: "query";
	route: Route;
	input?: QueryRouteInput<Route>;
};

export type InfiniteQueryTarget<
	Route extends InfiniteQueryRoute = InfiniteQueryRoute,
> = {
	mode: "infinite";
	route: Route;
	input?: InfiniteQueryRouteInput<Route>;
};

export type QueryTarget =
	| PathQueryTarget
	| ExactQueryTarget
	| InfiniteQueryTarget;

export type SalesQueryRef = {
	orderNo: string;
	salesId?: number;
	salesType: "order" | "quote";
};

export type QueryEventScope = {
	sales?: readonly SalesQueryRef[];
};

export type TypedQueryInvalidation = {
	path<Route extends QueryRoute>(route: Route): Promise<unknown>;
	query<Route extends QueryRoute>(
		route: Route,
		...args: InputArgs<QueryRouteInput<Route>>
	): Promise<unknown>;
	infinite<Route extends InfiniteQueryRoute>(
		route: Route,
		...args: InputArgs<InfiniteQueryRouteInput<Route>>
	): Promise<unknown>;
};

export function pathTarget<Route extends QueryRoute>(
	route: Route,
): PathQueryTarget<Route> {
	return {
		mode: "path",
		route,
	};
}

export function queryTarget<Route extends QueryRoute>(
	route: Route,
	...args: InputArgs<QueryRouteInput<Route>>
): ExactQueryTarget<Route> {
	return {
		input: args[0],
		mode: "query",
		route,
	};
}

export function infiniteTarget<Route extends InfiniteQueryRoute>(
	route: Route,
	...args: InputArgs<InfiniteQueryRouteInput<Route>>
): InfiniteQueryTarget<Route> {
	return {
		input: args[0],
		mode: "infinite",
		route,
	};
}
