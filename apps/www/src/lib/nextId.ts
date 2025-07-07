export async function nextId(model, where?) {
    return (await lastId(model, where)) + 1;
}
export async function lastId(model, _default = 0, where?) {
    return ((
        await model.findFirst({
            where: {
                deletedAt: undefined,
                ...(where || {}),
            },
            orderBy: {
                id: "desc",
            },
        })
    )?.id || _default) as number;
}
