import { inboundFilterStatus, noteTagNames } from "@gnd/utils/constants";
import { z } from "zod";

export const saveInboundNoteSchema = z.object({
  note: z.string().nullable().optional(),
  noteColor: z.string().nullable().optional(),
  salesId: z.number(),
  orderNo: z.string(),
  status: z.enum(inboundFilterStatus),
  attachments: z
    .array(
      z.object({
        pathname: z.string(),
      })
    )
    .optional(),
});
export type SaveInboundNoteSchema = z.infer<typeof saveInboundNoteSchema>;
export const saveDispatchNoteSchema = z.object({
  note: z.string().nullable().optional(),
  noteColor: z.string().nullable().optional(),
  salesId: z.number(),
  orderNo: z.string(),
  status: z.enum(inboundFilterStatus),
  attachments: z
    .array(
      z.object({
        pathname: z.string(),
      })
    )
    .optional(),
});
export type SaveDispatchNote = z.infer<typeof saveDispatchNoteSchema>;
