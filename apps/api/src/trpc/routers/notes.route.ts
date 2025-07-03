import { createTRPCRouter, publicProcedure } from "../init";
import { saveInboundNoteSchema } from "@api/schemas/notes";
import { saveInboundNote } from "@api/db/queries/note";

export const notesRouter = createTRPCRouter({
  saveInboundNote: publicProcedure
    .input(saveInboundNoteSchema)
    .mutation(async (props) => {
      return saveInboundNote(props.ctx, props.input);
    }),
});
