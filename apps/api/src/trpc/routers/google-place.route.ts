import { createTRPCRouter, publicProcedure } from "../init";

import {
  placeSchema,
  placeAutoCompleteSchema,
  searchGooglePlace,
  place,
} from "@api/db/queries/google-place";

export const google = createTRPCRouter({
  places: publicProcedure
    .input(placeAutoCompleteSchema)
    .query(async (props) => {
      return searchGooglePlace(props.ctx, props.input);
    }),
  place: publicProcedure.input(placeSchema).query(async (props) => {
    return place(props.input.placeId);
  }),
});
