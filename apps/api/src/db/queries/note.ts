import type { SaveInboundNoteSchema } from "@api/schemas/notes";
import type { TRPCContext } from "@api/trpc/init";

export async function saveInboundNote(
  ctx: TRPCContext,
  data: SaveInboundNoteSchema,
) {}
