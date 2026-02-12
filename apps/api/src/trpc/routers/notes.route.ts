import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { saveInboundNote } from "@api/db/queries/note";
import { saveNote, saveNoteSchema } from "@gnd/utils/note";
import z from "zod";

export const notesRouter = createTRPCRouter({
  saveInboundNote: publicProcedure
    .input(saveInboundNoteSchema)
    .mutation(async (props) => {
      return saveInboundNote(props.ctx, props.input);
    }),
  saveNote: publicProcedure.input(saveNoteSchema).mutation(async (props) => {
    return saveNote(props.ctx.db, props.input, props.ctx.userId);
  }),
  list: publicProcedure
    .input(
      z.object({
        contactIds: z.array(z.number()),
        maxPriority: z.number().optional(),
        pageSize: z.number().optional(),
        status: z.array(z.enum(["unread", "read", "archived"])).optional(),
      }),
    )
    .query(async (props) => {
      const {
        maxPriority,
        pageSize = 20,
        status = ["unread", "read"],
      } = props.input;

      return {
        data: [],
      };
    }),
});
