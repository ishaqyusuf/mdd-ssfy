import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { saveInboundNote } from "@api/db/queries/note";
import { saveNote, saveNoteSchema } from "@gnd/utils/note";

export const notesRouter = createTRPCRouter({
  saveInboundNote: publicProcedure
    .input(saveInboundNoteSchema)
    .mutation(async (props) => {
      return saveInboundNote(props.ctx, props.input);
    }),
  saveNote: publicProcedure.input(saveNoteSchema).mutation(async (props) => {
    return saveNote(props.ctx.db, props.input, props.ctx.userId);
  }),
});
