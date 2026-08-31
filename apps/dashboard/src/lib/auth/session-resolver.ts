export type HeadersLike = {
	forEach(
		callback: (value: string, key: string, parent?: unknown) => void,
	): void;
};

type ServerAuthSessionResolverOptions<T> = {
	cache(load: () => Promise<T>): () => Promise<T>;
	getRequestHeaders(): Promise<HeadersLike>;
	loadSession(headers: HeadersLike): Promise<T>;
};

export function createServerAuthSessionResolver<T>({
	cache,
	getRequestHeaders,
	loadSession,
}: ServerAuthSessionResolverOptions<T>) {
	const getCachedRequestSession = cache(async () =>
		loadSession(await getRequestHeaders()),
	);

	return (headers?: HeadersLike) =>
		headers ? loadSession(headers) : getCachedRequestSession();
}
