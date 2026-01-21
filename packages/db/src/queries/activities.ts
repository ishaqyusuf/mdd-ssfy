import { Db } from "..";

const activityTypes = ["sales_checkout_success"] as const;
const activityStatus = [] as const;
type CreateActivityParams = {
  //   teamId: string;
  userId?: number;
  type: (typeof activityTypes)[number];
  source: "system" | "user";
  status?: (typeof activityStatus)[number];
  priority?: number;
  groupId?: string;
  metadata: Record<string, any>;
};
export async function createActivity(db: Db, params: CreateActivityParams) {}

export async function updateActivityStatus(
  db: Db,
  activityId: string,
  status: (typeof activityStatus)[number],
  teamId: string,
) {}
export async function updateAllActivitiesStatus(
  db: Db,
  teamId: string,
  status: (typeof activityStatus)[number],
  options: { userId: string },
) {}

export type UpdateActivityMetadataParams = {
  activityId: string;
  //   teamId: string;
  metadata: Record<string, any>;
};
export async function updateActivityMetadata(
  db: Db,
  params: UpdateActivityMetadataParams,
) {
  return true;
}
