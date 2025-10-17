import { createLoader, parseAsString } from "nuqs/server";

const taskFilterParamsSchema = {
  q: parseAsString,
};

export const loadTaskFilterParams = createLoader(taskFilterParamsSchema);
