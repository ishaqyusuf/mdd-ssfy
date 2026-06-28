const undotFilterKey = (k) => k?.split(".")?.join("_");
export const __findFilterField = (field, filter) =>
	undotFilterKey(field?.value) === undotFilterKey(filter.id);
// export const __transformInputValue = (inputValue)
