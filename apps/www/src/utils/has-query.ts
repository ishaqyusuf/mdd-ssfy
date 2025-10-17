export const hasQuery = (query) =>
    Object.values(query).some((value) => value !== null);
