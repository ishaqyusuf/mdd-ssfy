import { inboundFilterStatus } from "@gnd/utils/constants";
import { z } from "zod";

export const saveInboundNoteSchema = z.object({
  note: z.string().nullable().optional(),
  noteColor: z.string().nullable().optional(),
  salesId: z.number(),
  orderNo: z.string(),
  status: z.enum(inboundFilterStatus),
});
export type SaveInboundNoteSchema = z.infer<typeof saveInboundNoteSchema>;
