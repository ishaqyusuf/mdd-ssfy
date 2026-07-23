export async function finalizeUploadedDocument<TDocument, TResult>(input: {
	pathname: string;
	register: () => Promise<TDocument>;
	finalize: (document: TDocument) => Promise<TResult>;
	deleteUpload: (pathname: string) => Promise<unknown>;
	markFailed: (document: TDocument) => Promise<unknown>;
}) {
	let registeredDocument: TDocument | undefined;
	try {
		registeredDocument = await input.register();
		return await input.finalize(registeredDocument);
	} catch (error) {
		await Promise.allSettled([
			input.deleteUpload(input.pathname),
			...(registeredDocument ? [input.markFailed(registeredDocument)] : []),
		]);
		throw error;
	}
}
