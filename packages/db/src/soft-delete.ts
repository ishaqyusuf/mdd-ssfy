type QueryArgs = {
	where?: Record<string, unknown>;
};

type ModelDelegate = {
	fields?: Record<string, unknown>;
};

function getModelDelegate(client: unknown, model: string) {
	if (!client || typeof client !== "object" || !model) {
		return null;
	}

	const clientKey = `${model.charAt(0).toLowerCase()}${model.slice(1)}`;
	const delegate = (client as Record<string, unknown>)[clientKey];

	if (!delegate || typeof delegate !== "object") {
		return null;
	}

	return delegate as ModelDelegate;
}

export function modelSupportsField(
	client: unknown,
	model: string,
	field: string,
) {
	const fields = getModelDelegate(client, model)?.fields;

	return Boolean(fields && Object.keys(fields).includes(field));
}

export function applyDefaultSoftDeleteFilter<T extends QueryArgs>(
	client: unknown,
	model: string,
	args: T,
) {
	if (!modelSupportsField(client, model, "deletedAt")) {
		return args;
	}

	const where = args.where ?? {};

	if (!Object.hasOwn(where, "deletedAt")) {
		args.where = { deletedAt: null, ...where };
	}

	return args;
}
