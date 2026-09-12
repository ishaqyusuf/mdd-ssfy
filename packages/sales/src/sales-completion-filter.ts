import { z } from "zod";

export const SALES_COMPLETION_FILTER_OPTIONS = [
	"pending",
	"completed",
] as const;

export const salesCompletionSatisfactionFilterSchema = z.enum(
	SALES_COMPLETION_FILTER_OPTIONS,
);
