import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema, saveNoteSchema } from "@api/schemas/notes";
import { saveInboundNote, saveNote } from "@api/db/queries/note";

export const notesRouter = createTRPCRouter({
  saveInboundNote: publicProcedure
    .input(saveInboundNoteSchema)
    .mutation(async (props) => {
      return saveInboundNote(props.ctx, props.input);
    }),
  saveNote: publicProcedure.input(saveNoteSchema).mutation(async (props) => {
    return saveNote(props.ctx, props.input);
  }),
});
