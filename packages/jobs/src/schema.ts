import { z } from "zod";
export const exampleTaskPayload = z.object({});
export type ExampleTaskPayload = z.infer<typeof exampleTaskPayload>;
