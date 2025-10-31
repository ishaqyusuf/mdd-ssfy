import { getOrganizationProfile } from "@api/db/queries/organization";
import { createTRPCRouter } from "../init";

export const orgs = createTRPCRouter({
  getOrganizationProfile,
});
